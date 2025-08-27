# gic_sec Adventure – Interactive Presentation

This mini–game explains the advantages of using the Rust **napi‑rs** framework to build
native Node.js modules and demonstrates how to build, install and use the
`gic_sec` crate shipped with this challenge. The presentation is fully
interactive and built with [Phaser 3](https://phaser.io/), using simple
platforming mechanics, progress bars and overlays to teach both technical and
non‑technical audiences.

## Running the presentation

The game consists of static HTML and JavaScript files. Because it loads
images, you should serve it via a local web server rather than opening the
`index.html` file directly from the filesystem. The simplest way to do this
is with Python or Node.js:

```bash
cd phaser_game
# With Python 3 (built in on most systems)
python3 -m http.server 8000

# Or using the http-server package from npm
npx http-server -p 8000
```

Then open your browser and navigate to `http://localhost:8000` to begin the
adventure.

## What you'll learn

* **Why Rust?** Collect icons that represent Rust’s core strengths, such as
  performance, memory safety and fearless concurrency.
* **Bridging Node and Rust:** Build a bridge between Node.js and Rust by
  pressing the spacebar. This illustrates how napi‑rs automatically
  generates native bindings and TypeScript definitions.
* **Build steps:** Walk past signposts that explain how to initialise a
  package, install the napi‑rs CLI, compile the Rust crate into a `.node`
  file and link it into your project.
* **Explore the `gic_sec` API:** Interact with stations to see how to
  encode/decode JWTs, generate passwords, compute hashes, and produce
  random base64 strings and UUIDs. The game includes simple JavaScript
  implementations of these functions to demonstrate their outputs.
* **Conclusion:** Read a final summary encouraging you to adopt a culture of
  writing your own native modules when using TypeScript on both the
  frontend and backend.

Enjoy your exploration of Rust and Node.js, and feel free to extend or
customise this presentation to suit your own use cases!