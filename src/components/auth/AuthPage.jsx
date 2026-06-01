import { useState } from 'react'
import SignInForm from './SignInForm'
import SignUpForm from './SignUpForm'
import AuthSidebar from './AuthSidebar'

function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl">
        <div className="flex flex-col md:flex-row">
          {/* Formulaire de connexion/inscription */}
          <div className="w-full md:w-1/2 p-8 md:p-12">
            {isSignUp ? (
              <SignUpForm onToggle={() => setIsSignUp(false)} />
            ) : (
              <SignInForm onToggle={() => setIsSignUp(true)} />
            )}
          </div>

          {/* Sidebar colorée */}
          <div className="w-full md:w-1/2">
            <AuthSidebar isSignUp={isSignUp} onToggle={() => setIsSignUp(!isSignUp)} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
