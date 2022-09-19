# Helix

Helix Jump code audition game

The game is not called cyber replicant, I just used one of my Git accounts to host it easily via Github Pages :). Please note the contributors listed on Github are all different accounts of mine, I was working on multiple computers so the Git authors are a bit of a mess - sorry about that.


## Running the project

This project has no external dependencies.

To run it, simply start a web server in the root directory of the project. I usually use Python for this e.g.

```
python -m http.server
```

Feel free to use the web server of your choice.

The project is running live here:

```
https://cyber-replicant.github.io
```

## Dependencies

All dependencies are in the repository under the `js/lib` directory.

### Three.js

As requested in the audition document. Used for almost everything in the game.

### Ammo.js

Used for basic physics interactions with the ball.

### Howler.js

Used for audio. I started out with HTML5 audio but had some issues with buffering. This could be replaced with HTML5 audio given more time.
