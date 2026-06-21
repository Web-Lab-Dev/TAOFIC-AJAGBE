import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { getAuthErrorMessage } from '../utils/authHelpers'
import { AUTH_ROLES } from '../constants/authMessages'
import { FIRESTORE_CONFIG } from '../constants/firestoreConstants'
import { firestoreService } from '../services/firestore'

const AuthContext = createContext()

export { AuthContext }

const createStoreId = (storeName, uid) => {
  const slug = String(storeName || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'boutique'}-${uid.slice(0, 6)}`
}

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

const fetchUserProfile = async (uid) => {
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
}

const fetchStoreProfile = async (profile) => {
  if (!profile?.storeId) {
    throw new Error('Compte non rattaché à une boutique')
  }

  const storeRef = doc(db, FIRESTORE_CONFIG.COLLECTIONS.STORES, profile.storeId)
  const storeSnap = await getDoc(storeRef)
  if (!storeSnap.exists()) {
    throw new Error('Boutique introuvable')
  }

  const storeData = storeSnap.data()
  const store = {
    id: profile.storeId,
    name: storeData.name || profile.storeName || 'Boutique',
    active: storeData.active !== false
  }

  if (!store.active) {
    throw new Error('Boutique inactive')
  }

  return store
}

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

  const signup = useCallback(async (email, password, storeName) => {
    try {
      setError('')
      setLoading(true)

      const normalizedStoreName = String(storeName || '').trim()
      if (!normalizedStoreName) {
        throw new Error('Le nom de la boutique est obligatoire')
      }
      const storeDisplayName = normalizedStoreName

      const normalizedEmail = normalizeEmail(email)
      const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
      const user = result.user
      const storeId = createStoreId(normalizedStoreName, user.uid)
      const now = serverTimestamp()
      const storePayload = {
        name: normalizedStoreName,
        email: normalizedEmail,
        active: true,
        adminUid: user.uid,
        createdAt: now,
        updatedAt: now
      }
      const profilePayload = {
        name: storeDisplayName,
        email: normalizedEmail,
        role: AUTH_ROLES.STORE_ADMIN,
        active: true,
        storeId,
        storeName: normalizedStoreName,
        createdAt: now,
        updatedAt: now,
        lastLogin: now
      }

      const batch = writeBatch(db)
      batch.set(doc(db, FIRESTORE_CONFIG.COLLECTIONS.STORES, storeId), storePayload)
      batch.set(doc(db, FIRESTORE_CONFIG.COLLECTIONS.USERS, user.uid), profilePayload)
      await batch.commit()

      const store = { id: storeId, name: normalizedStoreName, active: true }
      firestoreService.setActiveStore(store)
      setActiveStore(store)
      setUserProfile(profilePayload)

      return result
    } catch (error) {
      const createdUser = auth.currentUser
      if (createdUser && error?.code?.startsWith('permission-denied')) {
        try {
          await deleteUser(createdUser)
        } catch (deleteError) {
          console.error('Could not rollback orphan auth user:', deleteError)
        }
      }

      const errorMessage = getAuthErrorMessage(error.code, error.message)
      setError(errorMessage)
      setLoading(false)
      console.error('Signup error:', error)
      throw error
    }
  }, [])

  const signin = useCallback(async (email, password) => {
    try {
      setError('')
      setLoading(true)

      await setPersistence(auth, browserLocalPersistence)
      const result = await signInWithEmailAndPassword(auth, normalizeEmail(email), password)
      const profile = await fetchUserProfile(result.user.uid)
      const store = await fetchStoreProfile(profile)

      firestoreService.setActiveStore(store)
      setActiveStore(store)
      setUserProfile(profile)
      setCurrentUser(result.user)
      setLoading(false)

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
      await sendPasswordResetEmail(auth, normalizeEmail(email))
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
      return await fetchUserProfile(uid)
    } catch (error) {
      console.error('Error getting user profile:', error)
      setError(error.message || 'Compte non rattaché à une boutique')
      return null
    }
  }, [])

  const getStoreProfile = useCallback(async (profile) => {
    try {
      return await fetchStoreProfile(profile)
    } catch (error) {
      setError(error.message || 'Boutique introuvable')
      return null
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true)
      setCurrentUser(user)

      if (user) {
        const profile = await getUserProfile(user.uid)
        if (profile) {
          const store = await getStoreProfile(profile)
          if (!store?.active) {
            setError('Boutique inactive')
            setUserProfile(profile)
            setActiveStore(null)
            firestoreService.setActiveStore(null)
          } else {
            firestoreService.setActiveStore(store)
            setActiveStore(store)
            setUserProfile(profile)
            await setDoc(doc(db, FIRESTORE_CONFIG.COLLECTIONS.USERS, user.uid), {
              lastLogin: serverTimestamp()
            }, { merge: true })
          }
        } else {
          setUserProfile(null)
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
    getUserProfile
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
    getUserProfile
  ])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
