# Mistral et confidentialité — 29 octobre 2026

## Changements
- Clé API_KEY_MISTRAL enregistrée dans le coffre du projet (pas de synchronisation Doppler automatique).
- Chat direct Mistral : ministral-3b-latest, réponses et consommation réelles conservées.
- Lecture des images via le même modèle vision Mistral.
- Vocal : WAV complet par tour, Voxtral transcription → chat Mistral → Voxtral synthèse. Conversation alternée avec pause de détection ; pas un appel duplex avec interruption instantanée.
- L'ancien vocal Live est bloqué lorsque Mistral est configuré ; aucune substitution silencieuse.
- Classement des sujets local, sans appel au fournisseur précédent.
- Recherche web limitée à une requête administrative générique non personnelle : aucun message, historique ou texte de document transmis au moteur. Cette protection réduit la précision de recherche.

## Chiffrement et limites
Les nouvelles écritures de conversations, prompts, réponses, transcriptions, collections de profil/famille/rappels, métadonnées et originaux de documents sont chiffrées avant envoi au stockage GitHub. AES-256-GCM, IV aléatoire, clé AES dérivée par propriétaire avec HKDF-SHA256 et authentification du chemin. La clé maître reste dans le coffre sécurisé, jamais dans le dépôt. Une clé absente fait échouer l'écriture, sans repli en clair.

Il s'agit de chiffrement serveur, **pas de chiffrement de bout en bout** : le serveur déchiffre les données pour les lire ou les transmettre à Mistral. Un détenteur de la clé maître et de l'accès stockage pourrait les lire. Ne pas tourner ou supprimer la clé sans procédure de migration/récupération.

**Les données historiques et les anciens commits Git peuvent toujours contenir des données en clair.** La lecture rétrocompatible ne constitue pas une migration, une suppression d'historique ou une certification. Les chemins, dates, tailles et messages techniques de commit restent visibles. Le stockage local des anciens modules et les copies/journaux des prestataires ne sont pas couverts par ce changement.

Les échanges sortants utilisent HTTPS ; les documents rendus restent déchiffrés pour le propriétaire connecté. Les données nécessaires à l'IA sont transmises en clair au fournisseur à l'intérieur de cette connexion chiffrée. Aucune résidence intégralement UE ni absence de conservation chez tous les prestataires n'a été certifiée. Le fournisseur français ne rend pas à lui seul toute l'application souveraine. Confirmer DPA, région d'inférence, ZDR, accès, conservation, sauvegarde et effacement Git avant courriers sensibles réels.

## Vérifications
- Catalogue Mistral : HTTP 200 avec la clé du projet.
- Texte, synthèse française et retranscription d'une phrase parlée : HTTP 200.
- Chat connecté du propriétaire : réponse Mistral, jetons visibles, mémoire relue avec le modèle Mistral.
- Routes audio connectées : transcription et audio/mpeg reçus.
- Tests : aller-retour sans perte, absence de contenu lisible, refus autre propriétaire/chemin, refus clé absente, rejet de contenu altéré, modèles/voix et usage. 26 tests ciblés réussis au premier passage.

## Réponse proposée au commentaire LinkedIn (non publiée)
Merci beaucoup pour votre retour et cette question essentielle. Vous avez raison : un courrier sensible mérite des garanties vérifiables. Nous avons ajouté le chiffrement des nouvelles sauvegardes et intégré Mistral pour le texte et la voix. Mais cela ne constitue pas encore une certification complète : les anciennes copies, la localisation et la conservation chez les prestataires restent à vérifier. Pour les premiers essais, utilisez un courrier fictif ou masquez vos informations personnelles. Nous préciserons les garanties et les limites avant de recommander l'envoi de documents sensibles.