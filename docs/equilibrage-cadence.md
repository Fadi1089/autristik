# Progression de la cadence

## Références Tetris

Le [Tetris Design Guideline de 2009, section 7](https://studylib.net/doc/27262492/2009-tetris-design-guideline)
donne des intervalles de 1 s par ligne au niveau 1, 0,355 s au niveau 5,
0,064 s au niveau 10 et 0,007 s au niveau 15. C'est une accélération forte.
Cette ancienne version du guide sert de comparaison, sans supposer que tous les Tetris actuels
emploient exactement la même courbe.

Le [guide officiel de Tetris Effect: Connected](https://www.tetriseffect.game/beginners-community-guide/)
décrit un Marathon de 150 lignes, avec accélération progressive et une variante infinie.
Ultra dure trois minutes. La durée d'un Marathon dépend de la vitesse du joueur :
les règles ne donnent donc pas une durée de partie universelle à transposer.

## Courbe retenue pour Autristik

Les raccords de terrain, les rotations et les quatre côtés demandent du temps de décision.
On conserve 30 tuiles initiales, +6 à chaque niveau et les objectifs de 75, 125, 175 points, etc.

En difficulté Easy, l'intervalle entre deux cases, en secondes, est :

`0.45 + (1.5 - 0.45) × 0.93^(niveau - 1)`

Chaque niveau enlève 7 % de l'écart restant vers le minimum. Au début, cela réduit le délai
d'environ 4,9 % par niveau ; l'augmentation de difficulté devient ensuite plus douce.
La limite de 0,45 s par case laisse au moins 4,5 s avant la pose automatique d'une tuile
fraîchement apparue. La pose immédiate et l'avancée manuelle peuvent raccourcir ce délai.

| Niveau | Secondes par case | Avant pose automatique, depuis l'apparition |
| ------ | ----------------- | ------------------------------------------- |
| 1      | 1,500             | 15,00 s                                     |
| 2      | 1,427             | 14,27 s                                     |
| 5      | 1,235             | 12,35 s                                     |
| 10     | 0,996             | 9,96 s                                      |
| 15     | 0,830             | 8,30 s                                      |
| 20     | 0,714             | 7,14 s                                      |
| 30     | 0,578             | 5,78 s                                      |
| 50     | 0,480             | 4,80 s                                      |

Le niveau augmente uniquement au moment d'une pose. La nouvelle tuile emploie aussitôt
la nouvelle cadence ; le temps restant dans un tick est traité avec cette cadence.
Déplacer la tuile ou changer de côté conserve le temps déjà écoulé. La boucle de gravité
est mise à jour toutes les 50 ms pour limiter les écarts de cadence aux niveaux rapides.

## Difficultés de départ et chronomètre

Le sélecteur de Play / New game modifie uniquement la vitesse. Toutes les difficultés
commencent au niveau de score 1, avec 30 tuiles et les mêmes objectifs et récompenses.

| Difficulté | Cadence au départ par tuile | Progression                       |
| ---------- | --------------------------- | --------------------------------- |
| Easy       | 15 s                        | Courbe ci-dessus, dès le niveau 1 |
| Medium     | 9,96 s (environ 10 s)       | Courbe Easy décalée de 9 niveaux  |
| Hard       | 7,14 s (environ 7,1 s)      | Courbe Easy décalée de 19 niveaux |
| Insane     | 4,5 s                       | Vitesse maximale fixe             |

Insane reprend directement le minimum demandé de 4,5 s, même si la courbe Easy au
niveau 30 donne encore 5,78 s. Aucun mode ne descend sous ce minimum. Le choix effectué
en pause s'applique à la prochaine partie ; reprendre garde la difficulté actuelle.

Le chronomètre en haut à droite compte seulement le temps de jeu actif : il reste figé
en pause et en fin de partie, et repart de zéro pour une nouvelle partie. Il ne déclenche
jamais de fin de partie ; la fin reste liée à la réserve de tuiles.

## Estimation de durée et de réserve

Modèle simplifié pour Easy : moyenne constante de points par pose, multiplicateur déjà inclus,
objectifs et récompenses de niveau actuels, excédent de points perdu au passage de niveau
comme dans le jeu, aucune pause. Le bonus moyen de 0,1 tuile par pose représente approximativement
une récompense de raccord harmonieux tous les dix placements. Ce sont des hypothèses de
calibrage, pas des mesures de parties réelles ni une prédiction de la réussite du joueur.

| Points moyens/pose | Bonus moyen/pose | Tuiles posées | Niveau final | En attendant chaque pose automatique | Pose à mi-parcours en moyenne |
| ------------------ | ---------------- | ------------- | ------------ | ------------------------------------ | ----------------------------- |
| 0                  | 0                | 30            | 1            | 7,5 min                              | 3,8 min                       |
| 15                 | 0                | 54            | 5            | 12,0 min                             | 6,0 min                       |
| 25                 | 0                | 72            | 8            | 14,7 min                             | 7,4 min                       |
| 35                 | 0                | 84            | 10           | 16,3 min                             | 8,1 min                       |
| 15                 | 0,1              | 67            | 6            | 14,6 min                             | 7,3 min                       |
| 25                 | 0,1              | 87            | 9            | 17,4 min                             | 8,7 min                       |
| 35                 | 0,1              | 100           | 11           | 18,9 min                             | 9,4 min                       |

Cette première courbe vise environ 6–10 minutes de jeu actif pour les hypothèses de
15–35 points par pose, si le joueur pose en moyenne à la moitié du délai automatique.
Attendre toutes les chutes donne plutôt 12–19 minutes dans les mêmes scénarios.
Une meilleure maîtrise des raccords et des bonus peut prolonger beaucoup plus la partie.
La fin reste liée à l'épuisement des tuiles, sans limite de temps.

Les trois paramètres de vitesse sont regroupés dans `src/game/levels.ts` pour permettre
un ajustement après des essais réels.
