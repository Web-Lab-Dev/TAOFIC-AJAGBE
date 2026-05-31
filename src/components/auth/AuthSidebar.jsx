function AuthSidebar() {
  return (
    <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-white p-8 md:p-12 relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-16 -translate-y-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full transform -translate-x-12 translate-y-12"></div>

      <div className="text-center z-10">
        <h2 className="text-4xl font-bold mb-6">Bienvenue</h2>
        <p className="text-lg mb-8 opacity-90 leading-relaxed">
          Connectez-vous avec le compte<br />
          de votre boutique ou caissière
        </p>
        <p className="rounded-full border-2 border-white px-6 py-3 text-sm font-semibold">
          Comptes créés par la boutique
        </p>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="text-center">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-2">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <p className="text-sm opacity-75">TAOFIC AJAGBE</p>
        </div>
      </div>
    </div>
  )
}

export default AuthSidebar
