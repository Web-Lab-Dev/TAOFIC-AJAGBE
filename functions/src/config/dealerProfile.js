/**
 * dealerProfile.js — réseaux du circuit dealer, côté Cloud Functions.
 * ─────────────────────────────────────────────────────────────────────────────
 * Équivalent « functions » du bloc généré des règles (firestore.rules). Source de
 * vérité = le profil client (config/clients/<id>.js, champ dealer.networks). Le
 * pipeline de déploiement régénère ce fichier depuis le profil du client déployé.
 *
 * Défaut committé = référence TAOFIC (['Orange']) → comportement mono-réseau
 * strictement identique à l'historique. Un client multi-réseaux régénère la liste.
 *
 * Les handlers acceptent aussi `dealerNetworks` en injection (comme db/FieldValue),
 * pour tester le multi-réseaux sans régénérer ce fichier.
 */
export const DEALER_NETWORKS = ['Orange']
