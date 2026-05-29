import { useSimpleNetworkData } from '../../hooks/useSimpleNetworkData'
import NetworkCard from './NetworkCard'

const VISIBLE_NETWORK_CARDS = ['Orange', 'Liquidite']

function NetworkCardsDrawer() {
  const { networkData } = useSimpleNetworkData()
  const visibleCards = VISIBLE_NETWORK_CARDS
    .map(network => [network, networkData[network]])
    .filter(([, data]) => data)

  return (
    <section
      data-network-cards
      className="border-b border-slate-200 bg-white/95 shadow-sm"
      aria-label="Soldes opérationnels"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Soldes opérationnels
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            Orange Money et liquidité
          </h2>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
          {visibleCards.map(([network, data]) => (
            <NetworkCard
              key={network}
              network={network}
              stockAmount={data.stock}
              liquiditeAmount={data.liquidite}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default NetworkCardsDrawer
