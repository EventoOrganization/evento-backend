# 🔧 Stripe Webhook Troubleshooting Guide

## 🚨 Problème: Les webhooks Stripe ne fonctionnent pas en staging

### 🔍 Diagnostic

#### 1. Vérifier la Configuration

```bash
# Vérifier la configuration Stripe
pnpm check:stripe
```

#### 2. Vérifier les Variables d'Environnement

Assurez-vous que ces variables sont définies dans votre environnement staging :

```bash
# Variables requises
STRIPE_SECRET=sk_test_... ou sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLIENT_URL=https://your-staging-domain.com
```

#### 3. Tester l'Endpoint Webhook

```bash
# Tester l'endpoint de vérification
curl https://your-staging-domain.com/stripe-webhook/check
```

### 🛠️ Solutions

#### Solution 1: Configuration Webhook Stripe

1. **Accéder au Dashboard Stripe**

   - Allez sur https://dashboard.stripe.com/webhooks

2. **Créer/Modifier le Webhook**

   - URL: `https://your-staging-domain.com/stripe-webhook`
   - Événements à écouter:
     - `account.updated`
     - `account.external_account.created`
     - `account.external_account.updated`
     - `capability.updated`
     - `checkout.session.completed`

3. **Récupérer le Secret**
   - Copiez le "Signing secret" (commence par `whsec_`)
   - Ajoutez-le à vos variables d'environnement

#### Solution 2: Vérifier l'Accessibilité

1. **Test de Connectivité**

   ```bash
   # Tester si l'endpoint est accessible
   curl -X POST https://your-staging-domain.com/stripe-webhook/check
   ```

2. **Vérifier les Logs**
   ```bash
   # Dans les logs de votre serveur staging
   grep "Stripe Webhook" /var/log/web.stdout.log
   ```

#### Solution 3: Configuration CORS

Assurez-vous que votre serveur accepte les requêtes de Stripe :

```javascript
// Dans evento.ts
app.use(
  cors({
    origin: (origin, cb) => {
      // Stripe n'envoie pas d'origin, donc on l'accepte
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, origin);
      } else {
        cb(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
```

### 🔍 Debugging Avancé

#### 1. Logs Détaillés

Les logs suivants devraient apparaître quand un webhook est reçu :

```
📡 Stripe Webhook received: {
  method: 'POST',
  url: '/stripe-webhook',
  headers: {
    'stripe-signature': 'present',
    'content-type': 'application/json'
  },
  bodyLength: 1234
}
```

#### 2. Erreurs Communes

**Erreur: "Webhook signature failed"**

- Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct
- Assurez-vous que le secret correspond à l'endpoint

**Erreur: "Cannot set headers after they are sent"**

- Vérifiez qu'il n'y a pas de `next()` après `res.send()`
- Assurez-vous qu'une seule réponse est envoyée

**Erreur: 404 sur /healthz**

- Le problème de routing a été corrigé dans le code

### 🧪 Tests

#### Test 1: Webhook Local

```bash
# En développement
pnpm dev:stripe
```

#### Test 2: Webhook Staging

```bash
# Tester manuellement
curl -X POST https://your-staging-domain.com/stripe-webhook/check \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

#### Test 3: Création de Compte Stripe

1. Créez un compte Stripe via l'interface
2. Vérifiez les logs pour les événements `account.updated`
3. Vérifiez le dashboard Stripe pour les tentatives de livraison

### 📋 Checklist de Déploiement

- [ ] Variables d'environnement configurées
- [ ] Webhook créé dans Stripe Dashboard
- [ ] URL webhook correcte et accessible
- [ ] Secret webhook copié dans les variables d'environnement
- [ ] Serveur redémarré après modification des variables
- [ ] Logs vérifiés pour les erreurs
- [ ] Test de création de compte Stripe effectué

### 🔗 Liens Utiles

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Dashboard Webhooks](https://dashboard.stripe.com/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)

### 💡 Conseils

1. **En développement**: Utilisez `stripe listen` pour le forwarding
2. **En staging/production**: Configurez un webhook public
3. **Toujours vérifier les logs** pour diagnostiquer les problèmes
4. **Utilisez le script de vérification** avant le déploiement
5. **Testez avec des événements réels** plutôt que des simulations
