import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { getAuthErrorMessage, getDefaultUserProfile } from '../utils/authHelpers'
import { AUTH_ROLES } from '../constants/authMessages'
import { FIRESTORE_CONFIG } from '../constants/firestoreConstants'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const signup = useCallback(async (email, password, name) => {
    try {
      setError('')
      setLoading(true)

      const result = await createUserWithEmailAndPassword(auth, email, password)
      const user = result.user

      const userProfile = {
        name: name,
        email: email,
        role: AUTH_ROLES.EMPLOYEE,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      }

      await setDoc(doc(db, FIRESTORE_CONFIG.COLLECTIONS.USERS, user.uid), userProfile)
      return result
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error.code, error.message)
      setError(errorMessage)
      console.error('Signup error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const signin = useCallback(async (email, password) => {
    try {
      setError('')
      setLoading(true)

      const result = await signInWithEmailAndPassword(auth, email, password)

      if (result.user) {
        await setDoc(doc(db, FIRESTORE_CONFIG.COLLECTIONS.USERS, result.user.uid), {
          lastLogin: serverTimestamp()
        }, { merge: true })
      }

      return result
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error.code, error.message)
      setError(errorMessage)
      console.error('Signin error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      setError('')
      await signOut(auth)
      setUserProfile(null)
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
        return docSnap.data()
      } else {
        const basicProfile = getDefaultUserProfile(currentUser?.email)
        await setDoc(docRef, basicProfile)
        return basicProfile
      }
    } catch (error) {
      console.error('Error getting user profile:', error)
      return null
    }
  }, [currentUser?.email])


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)

      if (user) {
        const profile = await getUserProfile(user.uid)
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [getUserProfile])

  const value = useMemo(() => ({
    currentUser,
    userProfile,
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
