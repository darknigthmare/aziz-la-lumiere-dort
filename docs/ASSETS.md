# Registre des ressources — 4 novembre 2026

Ce registre recense les six fichiers distribués dans `assets/`. Les empreintes désignent les octets actuels ; elles ne prouvent pas à elles seules la paternité ni une licence. Les descriptions de provenance reprennent les documents existants, sans attribuer un auteur individuel non documenté.

Le manifeste exploitable est [assets-manifest.json](assets-manifest.json). Les visuels Canvas, cartes, textes et sons procéduraux sont décrits dans [SOURCE_PROVENANCE.md](../SOURCE_PROVENANCE.md) ; ce sont des ressources produites par le code, pas des fichiers audio ou modèles importés.

| Fichier | Taille en octets | Origine documentée | À compléter |
|---|---:|---|---|
| `assets/aziz-giza-1926-keyart.webp` | 109126 | Création générée avec l’outil d’image OpenAI intégré le 30 août 2026 ; conversion WebP. | Attribution nominative et licence |
| `assets/aziz-giza-1926-social.jpg` | 65773 | Dérivée JPEG du key art AZIZ pour les aperçus Open Graph. | Attribution nominative et licence |
| `assets/icon-180.png` | 6350 | Icône PNG présente dans le commit e75bfdd. La filiation exacte avec le SVG et la commande de génération ne sont pas documentées. | Chaîne de génération, attribution et licence |
| `assets/icon-192.png` | 6840 | Icône PNG présente dans le commit e75bfdd. La filiation exacte avec le SVG et la commande de génération ne sont pas documentées. | Chaîne de génération, attribution et licence |
| `assets/icon-512.png` | 18781 | Icône PNG présente dans le commit e75bfdd. La filiation exacte avec le SVG et la commande de génération ne sont pas documentées. | Chaîne de génération, attribution et licence |
| `assets/icon.svg` | 630 | Icône SVG originale créée spécifiquement pour la reconstruction AZIZ. | Attribution nominative et licence |

## Diffusion

Le dépôt ne contient pas encore de fichier `LICENSE`. Le choix de licence appartient au propriétaire et reste ouvert dans **RT-008**. Ce document n’accorde pas de licence implicite et ne modifie pas les droits existants.

Le prompt du key art et ses conversions sont conservés dans [KEY_ART_PROMPT.md](KEY_ART_PROMPT.md). Aucune archive historique 4.x ni le binaire de l’archive v1.2.0 annoncée ne sont présentés comme récupérés.

## Mise à jour

Lorsqu’un asset est remplacé, mettre à jour son chemin, son origine, sa source et son SHA-256 dans le manifeste, puis lancer `npm run release:prepare` pour régénérer les empreintes du jeu hors ligne. L’ajout d’une ressource distante obligatoire reste exclu du contrat de fonctionnement hors connexion.
