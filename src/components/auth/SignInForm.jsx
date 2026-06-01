import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useFormValidation } from '../../hooks/useFormValidation'
import { AUTH_LABELS, AUTH_PLACEHOLDERS } from '../../constants/authMessages'
import { AUTH_STYLES, THEME_VARIANTS } from '../../constants/authStyles'
import ForgotPasswordModal from './ForgotPasswordModal'

function SignInForm({ onToggle }) {
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const { signin } = useAuth()
  const navigate = useNavigate()

  // Utilisation du hook de validation de formulaire
  const {
    errors,
    isSubmitting,
    getFieldProps,
    getFieldError,
    hasFieldError,
    handleSubmit: handleFormSubmit,
    shouldShowErrors
  } = useFormValidation(
    { email: '', password: '' },
    {},
    { validateOnChange: false, validateOnBlur: true }
  )

  const handleSubmit = async (e) => {
    e.preventDefault()

    const result = await handleFormSubmit(async (formValues) => {
      await signin(formValues.email, formValues.password)
      navigate('/profil')
    })

    if (!result.success && result.error) {
      // L'erreur est déjà gérée par le hook
      console.error('Erreur de connexion:', result.error)
    }
  }

  const emailProps = getFieldProps('email')
  const passwordProps = getFieldProps('password')

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className={AUTH_STYLES.text.title}>{AUTH_LABELS.SIGN_IN}</h2>
        <p className={AUTH_STYLES.text.subtitle}>ou utilisez votre email et mot de passe</p>
      </div>

      {shouldShowErrors && (errors.submit || errors.email || errors.password) && (
        <div className={`${AUTH_STYLES.message.error} mb-4`}>
          {errors.submit || errors.email || errors.password}
        </div>
      )}

      <form onSubmit={handleSubmit} className={AUTH_STYLES.spacing.form}>
        <div>
          <input
            type="email"
            placeholder={AUTH_PLACEHOLDERS.EMAIL}
            {...emailProps}
            className={`${THEME_VARIANTS.primary.input} ${hasFieldError('email') ? 'border border-red-300' : ''}`}
            required
            aria-label={AUTH_PLACEHOLDERS.EMAIL}
          />
          {hasFieldError('email') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
          )}
        </div>

        <div>
          <input
            type="password"
            placeholder={AUTH_PLACEHOLDERS.PASSWORD}
            {...passwordProps}
            className={`${THEME_VARIANTS.primary.input} ${hasFieldError('password') ? 'border border-red-300' : ''}`}
            required
            aria-label={AUTH_PLACEHOLDERS.PASSWORD}
          />
          {hasFieldError('password') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('password')}</p>
          )}
        </div>

        <div className="text-right">
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className={`text-sm ${AUTH_STYLES.text.link}`}
            aria-label="Ouvrir le formulaire de réinitialisation de mot de passe"
          >
            {AUTH_LABELS.FORGOT_PASSWORD}
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={THEME_VARIANTS.primary.button}
          aria-label={isSubmitting ? AUTH_LABELS.LOADING_SIGNIN : AUTH_LABELS.SUBMIT_SIGNIN}
        >
          {isSubmitting ? AUTH_LABELS.LOADING_SIGNIN : AUTH_LABELS.SUBMIT_SIGNIN}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className={AUTH_STYLES.text.body}>
          Nouvelle boutique ?{' '}
          <button
            onClick={onToggle}
            className={THEME_VARIANTS.primary.link}
            aria-label="Créer un compte boutique"
          >
            Créer un compte boutique
          </button>
        </p>
        <p className={`${AUTH_STYLES.text.body} mt-3`}>
          Chaque boutique utilise son propre compte pour travailler.
        </p>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  )
}

export default SignInForm
