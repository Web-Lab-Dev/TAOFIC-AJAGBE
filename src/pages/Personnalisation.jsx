import { useTheme } from '../context/ThemeContext.jsx'

function Personnalisation() {
  const { currentTheme, themes, themeClasses, changeTheme } = useTheme()

  const getThemeDisplayColor = (themeId) => {
    const colorMap = {
      blue: 'bg-blue-600',
      light: 'bg-gray-600',
      dark: 'bg-gray-800',
      green: 'bg-green-600',
      purple: 'bg-purple-600'
    }
    return colorMap[themeId] || 'bg-blue-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className={`text-2xl font-bold ${themeClasses.text} mb-6`}>
        Personnalisation
      </h2>

      <div className="mb-8">
        <h3 className={`text-lg font-semibold ${themeClasses.text} mb-4`}>
          Choix du thème
        </h3>

        <div className="grid grid-cols-5 gap-4 mb-6">
          {Object.values(themes).filter(theme => theme.id !== 'custom').map((theme) => (
            <button
              key={theme.id}
              onClick={() => changeTheme(theme.id)}
              className={`p-4 rounded-lg shadow border-2 transition-all duration-200 ${
                currentTheme === theme.id
                  ? 'border-blue-500 bg-blue-50 scale-105'
                  : 'border-gray-300 hover:border-gray-400 bg-white hover:scale-102'
              }`}
            >
              <div className="text-center">
                <div className={`w-8 h-8 rounded-full mx-auto mb-2 ${getThemeDisplayColor(theme.id)} border border-gray-300 shadow-sm`}></div>
                <span className="text-sm font-medium text-gray-700">{theme.name}</span>
                {currentTheme === theme.id && (
                  <div className="mt-1">
                    <span className="text-xs text-blue-600 font-semibold">✓ Actif</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Personnalisation