import { useState, useCallback, memo } from 'react'
import { NETWORK_CONFIG, formatAmountWithCurrency } from '../../constants/networkConfig'
import { useNetworkCards } from '../../hooks/useNetworkCards'

function NetworkCard({ network, stockAmount, liquiditeAmount }) {
  const config = NETWORK_CONFIG[network]
  const { updateStock, updateLiquidity } = useNetworkCards()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  const isLiquiditeCard = network === 'Liquidite'
  const displayAmount = isLiquiditeCard ? liquiditeAmount : stockAmount
  const { amount, label } = config
    ? formatAmountWithCurrency(displayAmount, isLiquiditeCard)
    : { amount: '0', label: '' }

  // Indicateurs de stock
  const getStockStatus = () => {
    if (isLiquiditeCard) return 'normal'

    const stockValue = stockAmount || 0
    if (stockValue <= 0) return 'critical'
    if (stockValue < 10000) return 'low'
    if (stockValue < 25000) return 'warning'
    return 'normal'
  }

  const stockStatus = getStockStatus()
  const statusConfig = {
    critical: {
      indicator: 'bg-red-500',
      glow: 'ring-2 ring-red-200',
      text: 'text-red-600'
    },
    low: {
      indicator: 'bg-orange-500',
      glow: 'ring-2 ring-orange-200',
      text: 'text-orange-600'
    },
    warning: {
      indicator: 'bg-yellow-500',
      glow: 'ring-1 ring-yellow-200',
      text: 'text-yellow-600'
    },
    normal: {
      indicator: 'bg-green-500',
      glow: '',
      text: 'text-green-600'
    }
  }

  // Logique d'édition pour STOCKS et LIQUIDITÉ
  const saveAmount = useCallback(() => {
    const newAmount = parseFloat(editValue) || 0

    if (isLiquiditeCard) {
      // Éditer la liquidité totale
      updateLiquidity(newAmount)
    } else {
      // Éditer le stock du réseau
      updateStock(network, newAmount)
    }

    setIsEditing(false)
  }, [editValue, isLiquiditeCard, network, updateStock, updateLiquidity])

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true)
    setEditValue(displayAmount.toString())
  }, [displayAmount])

  const handleInputChange = useCallback((e) => {
    setEditValue(e.target.value)
  }, [])

  const handleInputKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveAmount()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsEditing(false)
      setEditValue(displayAmount.toString())
    }
  }, [saveAmount, displayAmount])

  const handleInputBlur = useCallback(() => {
    saveAmount()
  }, [saveAmount])

  const isValidAmount = useCallback((value) => {
    const num = parseFloat(value)
    return !isNaN(num) && num >= 0
  }, [])

  if (!config) return null

  return (
    <div
      className={`
        bg-gradient-to-br ${config.gradient}
        border ${config.border}
        rounded-lg shadow-sm
        p-3 flex-1 min-w-[140px] max-w-[180px]
        transition-all duration-200 hover:shadow-md
        ${statusConfig[stockStatus].glow}
      `}
      title={`Double-cliquez pour éditer le montant${!isLiquiditeCard ? ` - Stock: ${stockStatus}` : ''}`}
    >
      {/* En-tête avec point coloré et nom */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <h3 className={`font-semibold text-xs ${config.text}`}>
            {config.name}
          </h3>
        </div>

        {/* Indicateur de niveau de stock */}
        {!isLiquiditeCard && stockStatus !== 'normal' && (
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${statusConfig[stockStatus].indicator} animate-pulse`} />
            {stockStatus === 'critical' && (
              <span className="text-xs text-red-500 font-bold">!</span>
            )}
          </div>
        )}
      </div>

      {/* Section Stock/Liquidité */}
      <div
        className="text-center"
        onDoubleClick={handleDoubleClick}
        style={{ cursor: 'pointer' }}
      >
        {isEditing ? (
          <input
            type="number"
            value={editValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            className={`font-bold text-lg ${config.text} mb-1 w-full text-center bg-transparent border-b-2 outline-none transition-all duration-200 ${
              isValidAmount(editValue)
                ? 'border-current focus:border-opacity-100'
                : 'border-red-500 focus:border-red-600'
            }`}
            autoFocus
            min="0"
            step="1000"
            placeholder="Montant"
          />
        ) : (
          <div className={`font-bold text-lg ${config.text} mb-1 transition-transform duration-200 hover:scale-105`}>
            {amount}
          </div>
        )}
        <span className={`text-xs ${config.textLight} font-medium`}>
          {label}
        </span>
      </div>
    </div>
  )
}

export default memo(NetworkCard)
