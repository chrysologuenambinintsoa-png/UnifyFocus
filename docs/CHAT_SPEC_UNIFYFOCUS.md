# Chat — Spécification de design et fonctionnalité pour UnifyFocus

Version: 1.0
Auteur: équipe produit / dev
Date: 2026-06-21

But
- Standardiser le design et le comportement du chat (Copilot Chat) pour UnifyFocus.
- Fournir une spécification claire pour l'implémentation, tests et maintenabilité.

Principes de design
- Minimaliste: interface épurée, centrée sur les messages et la saisie.
- Consistance: utilisation des tokens Tailwind/variables existants (`bg-background`, `bg-card`, `bg-accent`, `text-foreground`, `border-border`, `gold` etc.).
- Accessibilité: clavier-first, focus visible, lectures d'état pour lecteurs d'écran.
- Mobile-first: input fixe en bas, messages empilés verticalement.

Layout principal
- Single-column centered layout.
  - Container: `max-w-2xl mx-auto` (desktop) / `w-full px-4` (mobile)
  - Messages: centrés horizontalement, largeur max `max-w-2xl`, bulles responsives.
- Input: fixe en bas de la fenêtre.
  - Wrapper: `fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 p-4`.
  - Textarea: `w-full min-h-[52px] max-h-[200px] resize-none rounded-md bg-background border border-border p-3 pl-12 pr-12`.
  - Upload icon: positionné à `left-3` (absolu) et activable via label/input caché.
  - Send button: `absolute right-2 top-1/2 -translate-y-1/2`.

Composants et classes recommandés
- `ChatView` — conteneur principal.
- `MessageList` — wrapper ScrollArea avec `pb-32` pour éviter le recouvrement par l'input.
- `MessageBubble` — props: `{ role: 'user' | 'assistant', content, timestamp }`.
  - user: `bg-accent text-foreground rounded-md p-3 ml-auto`.
  - assistant: `bg-card border border-border rounded-md p-3 mr-auto`.
- `ChatInput` — input fixe avec file upload and send controls.

Comportement et interactions
- Envoi de message:
  - `Enter` envoie (sauf si `Shift+Enter` pour nouvelle ligne).
  - Bouton envoyer désactivé si input vide ou `isLoading`.
  - Pendant génération (`isLoading`) le bouton affiche loader et est désactivé.
- Upload:
  - Input fichier accessible via icône (label) à gauche.
  - Les fichiers ajoutés sont représentés dans la zone d'input par une liste de noms (preview simplifiée). Pour plus tard: previews inline pour images/vidéos.
  - Revenir à la valeur vide après sélection pour permettre re-upload du même fichier.
- Scroll / autoscroll:
  - Par défaut, scroller vers le bas quand de nouveaux messages arrivent.
  - Si l'utilisateur a scrollé vers le passé (scrollTop < scrollHeight - threshold), ne pas forcer le scroll.
- Groupement:
  - Optionnel: grouper messages séquentiels du même rôle pour réduire l'espace vertical.
- Copie / actions:
  - Actions assistantes: copier texte, télécharger, regénérer — par défaut seulement `Copier` visible.

API et contrat serveur
- POST `/api/chat`
  - payload: `{ userId, conversationId?, message, model?, history?: [{role, content}] }`
  - response: `{ ok: boolean, response?: string, credits?: number, error?: string }`
  - erreurs doivent renvoyer code HTTP approprié + body `{ error: '...' }`.
- Conversations endpoints (utilisés par `ChatView`):
  - GET `/api/conversations?userId=...&type=chat` => liste conversations
  - POST `/api/conversations` => create conversation
  - GET `/api/conversations/:id` => messages
  - DELETE/PATCH as implemented currently

Sécurité, quotas, et limites
- Validation server-side des fichiers (size, type).
- Taille max d'input: `MAX_CHARS` (existant dans `AiEditorView`), appliquer limite similaire pour chat.
- Rate limiting côté API (ex: 5 req/s par utilisateur ou selon plan).

Accessibilité
- Tous les contrôles keyboard-accessible.
- Textarea avec `aria-label` et `aria-multiline`.
- Annonces polies (aria-live) pour messages d'erreur et confirmations (par ex. upload réussi).
- Contrastes conformes (WCAG AA) pour texte sur bulles.

Tests recommandés
- Unit tests: `ChatView` renders, `ChatInput` behaviors (enter/send/shift+enter), upload handler.
- Integration: simulate message flow, conversation creation.
- E2E: Cypress/Playwright flows: send message, receive assistant reply, upload file, accessibility checks.

Monitoring et analytics
- Événements à track: `chat_message_sent`, `chat_message_received`, `file_uploaded`, `chat_error`.
- Capturer latence (request -> response) pour alerting.

Fichiers à mettre à jour
- `src/components/views/chat-view.tsx` — implémentation UI (actuellement modifiée).
- `src/components/ui/textarea.tsx` — vérifier styles et props accessibles.
- `src/app/globals.css` ou `tailwind.config.ts` — tokens de design si besoin.

Guidelines d'évolution
- Commencer par stabiliser la version minimaliste.
- Ajouter tests unitaires et e2e avant d'itérer des features (prévisualisation, attachment preview).
- Garder l'API contract stagé pour compatibilité ascendante.

Notes d'implémentation rapide
- Utiliser `ScrollArea` existant avec `ref` pour le scrolling.
- Input file: utiliser `label` + hidden `input[type=file]` pour styler l'icône.
- Respecter le store `useAppStore()` pour conversations/créations/credits.

Annexes
- Exemple d'HTML pour input (résumé):

```
<div class="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-50">
  <div class="max-w-2xl mx-auto relative">
    <label class="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer">[UploadIcon]
      <input type="file" class="hidden" />
    </label>
    <textarea class="w-full pl-12 pr-12 ..." />
    <button class="absolute right-2 top-1/2 -translate-y-1/2">Send</button>
  </div>
</div>
```

---
Pour valider: review rapide avec l'équipe produit UX, puis je peux créer les composants réutilisables (`MessageList`, `MessageBubble`, `ChatInput`) et ajouter tests. Veux-tu que je génère ces composants maintenant ?
