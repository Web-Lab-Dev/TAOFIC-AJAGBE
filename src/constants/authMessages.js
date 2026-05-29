// Messages d'erreur et de succès pour l'authentification
export const AUTH_ERRORS = {
  // Erreurs Firebase Auth
  'auth/user-not-found': 'Aucun utilisateur trouvé avec cet email',
  'auth/wrong-password': 'Mot de passe incorrect',
  'auth/email-already-in-use': 'Cet email est déjà utilisé',
  'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères',
  'auth/invalid-email': 'Email invalide',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
  'auth/requires-recent-login': 'Cette action nécessite une reconnexion récente',

  // Erreurs de validation
  EMPTY_FIELDS: 'Veuillez remplir tous les champs',
  PASSWORD_MISMATCH: 'Les mots de passe ne correspondent pas',
  PASSWORD_MIN_LENGTH: 'Le mot de passe doit contenir au moins 6 caractères',
  PASSWORD_SAME: 'Le nouveau mot de passe doit être différent de l\'ancien',
  INVALID_EMAIL_FORMAT: 'Format d\'email invalide',

  // Erreurs générales
  LOGIN_FAILED: 'Échec de la connexion. Vérifiez vos identifiants.',
  SIGNUP_FAILED: 'Échec de l\'inscription. Vérifiez vos informations.',
  LOGOUT_FAILED: 'Erreur lors de la déconnexion',
  PASSWORD_RESET_FAILED: 'Erreur lors de l\'envoi de l\'email de réinitialisation',
  PASSWORD_CHANGE_FAILED: 'Erreur lors de la modification du mot de passe',
  PROFILE_FETCH_FAILED: 'Erreur lors de la récupération du profil',

  // Erreurs par défaut
  GENERIC_ERROR: 'Une erreur est survenue',
  NETWORK_ERROR: 'Erreur de connexion. Vérifiez votre connexion internet.'
}

export const AUTH_SUCCESS = {
  LOGIN_SUCCESS: 'Connexion réussie',
  SIGNUP_SUCCESS: 'Compte créé avec succès',
  LOGOUT_SUCCESS: 'Déconnexion réussie',
  PASSWORD_RESET_EMAIL_SENT: 'Un email de réinitialisation a été envoyé à votre adresse',
  PASSWORD_RESET_SENT: 'Un email de réinitialisation a été envoyé à votre adresse',
  PASSWORD_CHANGED: 'Mot de passe modifié avec succès',
  PROFILE_UPDATED: 'Profil mis à jour avec succès'
}

export const AUTH_PLACEHOLDERS = {
  EMAIL: 'Adresse email',
  PASSWORD: 'Mot de passe',
  CURRENT_PASSWORD: 'Mot de passe actuel',
  NEW_PASSWORD: 'Nouveau mot de passe',
  CONFIRM_PASSWORD: 'Confirmer le mot de passe',
  FULL_NAME: 'Nom complet'
}

export const AUTH_LABELS = {
  SIGN_IN: 'Connexion',
  SIGN_UP: 'Créer un compte',
  SIGN_OUT: 'Se déconnecter',
  FORGOT_PASSWORD: 'Mot de passe oublié ?',
  CHANGE_PASSWORD: 'Changer le mot de passe',
  CONFIRM_LOGOUT: 'Confirmer la déconnexion',

  // Boutons
  SUBMIT_SIGNIN: 'SE CONNECTER',
  SUBMIT_SIGNUP: 'S\'INSCRIRE',
  SUBMIT_SEND: 'Envoyer',
  SUBMIT_RESET: 'Envoyer',
  SUBMIT_CHANGE: 'Modifier',
  CANCEL: 'Annuler',

  // États de chargement
  LOADING_SIGNIN: 'Connexion...',
  LOADING_SIGNUP: 'Inscription...',
  LOADING_LOGOUT: 'Déconnexion...',
  LOADING_SENDING: 'Envoi...',
  LOADING_RESET: 'Envoi...',
  LOADING_CHANGING: 'Modification...'
}

export const AUTH_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
  USER: 'user'
}

export const AUTH_ROLE_LABELS = {
  [AUTH_ROLES.ADMIN]: 'Administrateur',
  [AUTH_ROLES.EMPLOYEE]: 'Employé',
  [AUTH_ROLES.USER]: 'Utilisateur'
}

// Configurations
export const AUTH_CONFIG = {
  MIN_PASSWORD_LENGTH: 6,
  PASSWORD_RESET_TIMEOUT: 3000,
  SUCCESS_MESSAGE_TIMEOUT: 2000,
  MAX_LOGIN_ATTEMPTS: 5
}