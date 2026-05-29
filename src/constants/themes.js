import { getStorageKey } from '../config/clientIsolation'

export const THEMES = {
  blue: {
    id: 'blue',
    name: 'Thème Bleu',
    backgroundImage: '/bg-bleu.png',
    classes: {
      background: 'bg-blue-50',
      text: 'text-gray-900',
      accent: 'bg-blue-600',
      navbar: 'bg-blue-600/95 backdrop-blur-sm',
      tableHeader: 'bg-blue-100/80 border-blue-300',
      tableAccent: 'bg-blue-50/60'
    }
  },
  light: {
    id: 'light',
    name: 'Thème Clair',
    backgroundImage: '/bg-noir.png',
    classes: {
      background: 'bg-white',
      text: 'text-gray-900',
      accent: 'bg-gray-600',
      navbar: 'bg-gray-600/95 backdrop-blur-sm text-white',
      tableHeader: 'bg-gray-100/80 border-gray-300',
      tableAccent: 'bg-gray-50/60'
    }
  },
  dark: {
    id: 'dark',
    name: 'Thème Sombre',
    backgroundImage: '/bg-noir.png',
    classes: {
      background: 'bg-white',
      text: 'text-gray-900',
      accent: 'bg-gray-800',
      navbar: 'bg-gray-800/95 backdrop-blur-sm text-white',
      tableHeader: 'bg-gray-800/80 border-gray-700 text-white',
      tableAccent: 'bg-gray-800/60 text-white'
    }
  },
  green: {
    id: 'green',
    name: 'Thème Vert',
    backgroundImage: '/bg-vert.png',
    classes: {
      background: 'bg-green-50',
      text: 'text-gray-900',
      accent: 'bg-green-600',
      navbar: 'bg-green-600/95 backdrop-blur-sm',
      tableHeader: 'bg-green-100/80 border-green-300',
      tableAccent: 'bg-green-50/60'
    }
  },
  purple: {
    id: 'purple',
    name: 'Thème Violet',
    backgroundImage: '/bg-viollet.png',
    classes: {
      background: 'bg-purple-50',
      text: 'text-gray-900',
      accent: 'bg-purple-600',
      navbar: 'bg-purple-600/95 backdrop-blur-sm',
      tableHeader: 'bg-purple-100/80 border-purple-300',
      tableAccent: 'bg-purple-50/60'
    }
  },
  custom: {
    id: 'custom',
    name: 'Couleur personnalisée',
    backgroundImage: '/bg-bleu.png',
    classes: {
      background: 'bg-white',
      text: 'text-gray-900',
      accent: 'bg-blue-500',
      navbar: 'bg-blue-500/95 backdrop-blur-sm',
      tableHeader: 'bg-gray-100/80 border-gray-300',
      tableAccent: 'bg-gray-50/60'
    }
  }
}

export const DEFAULT_THEME = 'blue'

export const STORAGE_KEY = getStorageKey('theme')
