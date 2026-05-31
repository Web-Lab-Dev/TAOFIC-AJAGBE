import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, functions } from '../config/firebase'
import { getAuthErrorMessage } from '../utils/authHelpers'
import { AUTH_ROLES } from '../constants/authMessages'
import { FIRESTORE_CONFIG } from '../constants/firestoreConstants'
import { firestoreService } from '../services/firestore'

const AuthContext = createContext()

export { AuthContext }

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [activeStore, setActiveStore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const signup = useCallback(async () => {
    throw new Error('La création de compte public est désactivée. Connectez-vous au compte boutique pour créer une caissière.')
  }, [])

  const signin = useCallback(async (email, password) => {
    try {
      setError('')
      setLoading(true)

      const result = await signInWithEmailAndPassword(auth, email, password)

      return result
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error.code, error.message)
      setError(errorMessage)
      setLoading(false)
      console.error('Signin error:', error)
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      setError('')
      await signOut(auth)
      setUserProfile(null)
      setActiveStore(null)
      firestoreService.setActiveStore(null)
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error.code, 'Erreur lors de la déconnexion')
      setError(errorMessage)
      console.error('Logout error:', error)
      throw error
    }
  }, [])

  const resetPassword = useCallback(async (email) => {
    try {
      setError('')
      await sendPasswordResetEmail(auth, email)
      return true
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error.code, error.message)
      setError(errorMessage)
      console.error('Password reset error:', error)
      throw error
    }
  }, [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      setError('')
      const user = auth.currentUser

      if (!user) {
        throw new Error('Utilisateur non connecté')
      }

      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
      return true
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error.code, error.message)
      setError(errorMessage)
      console.error('Password change error:', error)
      throw error
    }
  }, [])

  const getUserProfile = useCallback(async (uid) => {
    try {
      const docRef = doc(db, FIRESTORE_CONFIG.COLLECTIONS.USERS, uid)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const profile = docSnap.data()
        if (!profile.active || !profile.storeId) {
          throw new Error('Compte non rattaché à une boutique active')
        }
        return profile
      }

      throw new Error('Compte non rattaché à une boutique')
    } catch (error) {
      console.error('Error getting user profile:', error)
      setError(error.message || 'Compte non rattaché à une boutique')
      return null
    }
  }, [])

  const getStoreProfile = useCallback(async (profile) => {
    if (!profile?.storeId) return null

    const storeRef = doc(db, FIRESTORE_CONFIG.COLLECTIONS.STORES, profile.storeId)
    const storeSnap = await getDoc(storeRef)
    if (!storeSnap.exists()) {
      return null
    }
    const storeData = storeSnap.exists() ? storeSnap.data() : {}

    return {
      id: profile.storeId,
      name: storeData.name || profile.storeName || 'Boutique',
      active: storeData.active !== false
    }
  }, [])

  const createCashierAccount = useCallback(async ({ name, email }) => {
    if (userProfile?.role !== AUTH_ROLES.STORE_ADMIN || !userProfile?.storeId) {
      throw new Error('Seul le compte boutique peut créer une caissière')
    }

    const createCashier = httpsCallable(functions, 'createCashierAccount')
    const result = await createCashier({
      name,
      email,
      storeId: userProfile.storeId
    })

    return result.data
  }, [userProfile])


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true)
      setCurrentUser(user)

      if (user) {
        const profile = await getUserProfile(user.uid)
        setUserProfile(profile)
        if (profile) {
          await setDoc(doc(db, FIRESTORE_CONFIG.COLLECTIONS.USERS, user.uid), {
            lastLogin: serverTimestamp()
          }, { merge: true })
          const store = await getStoreProfile(profile)
          if (!store?.active) {
            setError('Boutique inactive')
            setActiveStore(null)
            firestoreService.setActiveStore(null)
          } else {
            setActiveStore(store)
            firestoreService.setActiveStore(store)
          }
        } else {
          setActiveStore(null)
          firestoreService.setActiveStore(null)
        }
      } else {
        setUserProfile(null)
        setActiveStore(null)
        firestoreService.setActiveStore(null)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [getStoreProfile, getUserProfile])

  const value = useMemo(() => ({
    currentUser,
    userProfile,
    activeStore,
    isStoreAdmin: userProfile?.role === AUTH_ROLES.STORE_ADMIN,
    loading,
    error,
    signup,
    signin,
    logout,
    resetPassword,
    changePassword,
    getUserProfile,
    createCashierAccount
  }), [
    currentUser,
    userProfile,
    activeStore,
    loading,
    error,
    signup,
    signin,
    logout,
    resetPassword,
    changePassword,
    getUserProfile,
    createCashierAccount
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
