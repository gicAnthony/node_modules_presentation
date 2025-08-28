/*
 * gic_sec Adventure
 *
 * This file contains an interactive presentation built with Phaser 3
 * that demonstrates why your team should adopt a Rust + napi‑rs workflow for
 * building high‑performance, memory‑safe Node.js modules. Each scene uses
 * arcade physics, simple platforming mechanics, progress bars and overlays
 * to gamify the learning process. The code is intentionally commented
 * throughout to make it easy for developers to follow along and extend.
 */
// -------- Scale Factors (tweak if you like) --------
const PLAYER_SCALE = 2.6;   // robot sprite size
const TILE_SCALE   = 1.25;  // ground/platform/crate
const MARKER_SCALE = 1.25;  // visible benefit markers / labels

(() => {
  // Global game state shared between scenes. It keeps track of which
  // benefits have been collected, whether the bridge has been built
  // and which example stations have been visited.
  const gameState = {
    benefitsCollected: {},
    examplesVisited: {},
  };

  // Helper to create overlay panels. Overlays are created above the
  // current scene and block input to the rest of the game until
  // dismissed. The function accepts a scene, a title, body text and
  // optional code/output sections. It returns a promise that resolves
  // once the overlay has been dismissed.
  function createOverlay(scene, { title, body, code, output }) {
    return new Promise((resolve) => {
      const width = scene.scale.width;
      const height = scene.scale.height;
      const overlay = scene.add.container(0, 0);
      // Semi‑transparent background
      const bg = scene.add.rectangle(0, 0, width, height, 0x000000, 0.8)
        .setOrigin(0);
      overlay.add(bg);
      const panelWidth = Math.min(700, width * 0.8);
      const panelHeight = Math.min(500, height * 0.8);
      const panelX = (width - panelWidth) / 2;
      const panelY = (height - panelHeight) / 2;
      const panel = scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x18202a, 0.95)
        .setOrigin(0);
      overlay.add(panel);
      // Title
      const titleText = scene.add.text(panelX + 20, panelY + 20, title, {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#ffffff',
        wordWrap: { width: panelWidth - 40 },
      });
      overlay.add(titleText);
      // Body
      const bodyY = titleText.y + titleText.height + 10;
      const bodyText = scene.add.text(panelX + 20, bodyY, body, {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#d0d0d0',
        wordWrap: { width: panelWidth - 40 }
      });
      overlay.add(bodyText);
      let codeText;
      let outputText;
      let nextY = bodyText.y + bodyText.height + 10;
      if (code) {
        codeText = scene.add.text(panelX + 20, nextY, code, {
          fontSize: '16px',
          fontFamily: 'Courier New',
          color: '#8bf0ff',
          wordWrap: { width: panelWidth - 40 }
        });
        overlay.add(codeText);
        nextY = codeText.y + codeText.height + 10;
      }
      if (output) {
        outputText = scene.add.text(panelX + 20, nextY, output, {
          fontSize: '16px',
          fontFamily: 'Courier New',
          color: '#d0ffce',
          wordWrap: { width: panelWidth - 40 }
        });
        overlay.add(outputText);
        nextY = outputText.y + outputText.height + 10;
      }
      // Close button
      const button = scene.add.text(panelX + panelWidth - 80, panelY + panelHeight - 40, 'Close', {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#247ba0',
        padding: { left: 10, right: 10, top: 5, bottom: 5 },
      }).setInteractive({ useHandCursor: true });
      overlay.add(button);
      button.on('pointerdown', () => {
        overlay.destroy();
        resolve();
      });
    });
  }

  /**
   * BootScene
   * Loads images and immediately starts the TitleScene. Preloading all
   * assets up front prevents stuttering when switching scenes later on.
   */
  class BootScene extends Phaser.Scene {
    constructor() {
      super('BootScene');
    }
    preload() {
      // Load backgrounds
      this.load.image('city_bg', 'assets/city_bg.png');
      this.load.image('security_bg', 'assets/security_bg.png');
      // Load platform tileset atlas for building proper ground and obstacles
      this.load.atlas('platform', 'assets/platform_tileset.png', 'assets/platform_tileset_atlas.json');
      // Load level layout (2D array) for more complex maps. The file defines
      // `data`, `tileWidth` and `tileHeight` fields and can be used with
      // Phaser’s tilemap API. It is optional but available if you wish to
      // customise levels further.
      this.load.json('level1', 'assets/platform_level_example.json');
      // Attempt to load robot animations and atlas if available. If the image is
      // missing the atlas loader will emit a warning but will not break the
      // game. To fully integrate the animated character please provide
      // `robot_platformer_spritesheet.png` alongside the JSON files.
      this.load.json('robotAnims', 'assets/robot_platformer_animations.json');
      this.load.atlas('robot', 'assets/robot_platformer_spritesheet.png', 'assets/robot_platformer_atlas.json');
    }
    create() {
      // Generate robot animations from the loaded JSON definitions. Doing
      // this here ensures all scenes can simply reference animations
      // without recreating them. If the animations already exist,
      // create() will silently skip them.
      const animDefs = this.cache.json.get('robotAnims').anims || [];
      animDefs.forEach((def) => {
        if (this.anims.exists(def.key)) return;
        this.anims.create({
          key: def.key,
          frames: def.frames.map((f) => ({ key: f.key, frame: f.frame })),
          frameRate: def.frameRate,
          repeat: def.repeat,
        });
      });
      this.scene.start('TitleScene');
    }
  }

  /**
   * TitleScene
   * Displays the opening screen with a striking background, the
   * presentation title and a start button. A subtle tween animates
   * the button to invite clicks.
   */
  class TitleScene extends Phaser.Scene {
    constructor() {
      super('TitleScene');
    }
    create() {
      const { width, height } = this.scale;
      // Add a consistent background image covering the entire screen. Store
      // it on the scene so it can be resized when the game scales.
      this.bg = this.add.image(0, 0, 'city_bg');
      this.bg.setOrigin(0);
      this.bg.setDisplaySize(width, height);
      // Update the background size on window resize
      this.scale.on('resize', (gameSize) => {
        const { width: w, height: h } = gameSize;
        this.bg.setDisplaySize(w, h);
      });
      // Title text
      const title = this.add.text(width / 2, height * 0.25, 'Node modules with Rust: GIC Security module', {
        fontSize: '42px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: width * 0.8 }
      }).setOrigin(0.5);
      // Subtitle
      this.add.text(width / 2, height * 0.35, 'Creating custom node modules to streamline and standardise code to avoid reinventing the wheel.', {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#aeeaff',
        align: 'center',
        wordWrap: { width: width * 0.8 }
      }).setOrigin(0.5);
      // Play button
      const playButton = this.add.text(width / 2, height * 0.55, 'Start Adventure', {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#0b3c5d',
        padding: { x: 20, y: 10 },
        borderRadius: 5
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      // Animate the button gently up and down
      this.tweens.add({
        targets: playButton,
        scale: { from: 1, to: 1.05 },
        yoyo: true,
        repeat: -1,
        duration: 800,
        ease: 'Sine.easeInOut'
      });
      playButton.on('pointerdown', () => {
        this.scene.start('BenefitScene');
      });
    }
  }

  /**
   * BenefitScene
   * A simple platformer where the player collects icons representing the
   * advantages of Rust and napi‑rs. Upon collection, informative overlays
   * pop up explaining each benefit in plain language.
   */
  class BenefitScene extends Phaser.Scene {
    constructor() {
      super('BenefitScene');
    }
    create() {
      const { width, height } = this.scale;
      // Consistent background across all scenes
      this.bg = this.add.image(0, 0, 'city_bg');
      this.bg.setOrigin(0);
      this.bg.setDisplaySize(width, height);
      // Resize handler for responsive backgrounds
      this.scale.on('resize', (gameSize) => {
        const { width: w, height: h } = gameSize;
        this.bg.setDisplaySize(w, h);
      });
      // Instructions text
      this.add.text(width / 2, 20, 'Move with arrow keys and collect all benefits', {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: { left: 10, right: 10, top: 5, bottom: 5 }
      }).setOrigin(0.5);
      // Build the ground using the provided platform tileset. We stitch
// together a left, middle and right top tile to span the entire
// width. Each tile is a static physics body so the player can
// stand on it. Using the atlas allows us to easily swap frames.
// (Now scaled up and with refreshBody() so Arcade uses the new size.)
const platforms = this.physics.add.staticGroup();
const tilePixel = 32;                 // authored tile size in atlas
const groundY   = height - 10;        // baseline for ground
const tilesWide = Math.ceil(width / (tilePixel * TILE_SCALE)) + 1;

for (let i = 0; i < tilesWide; i++) {
  let frame = 'ground_top';
  if (i === 0) frame = 'ground_top_left';
  else if (i === tilesWide - 1) frame = 'ground_top_right';

  const tile = this.physics.add.staticImage(
    i * tilePixel * TILE_SCALE,
    groundY,
    'platform',
    frame
  )
    .setScale(TILE_SCALE)
    .setOrigin(0, 1);

  tile.refreshBody();          // IMPORTANT after scaling static bodies
  platforms.add(tile);
}

// Add a few floating platforms and crates to vary gameplay. These
// platforms provide access to higher benefits and encourage jumping.
// Coordinates adapt to screen size and scale.
const floats = this.physics.add.staticGroup();

// Thin platforms (you can land on them)
const floatY = Math.max(120, height - Math.round(220 * TILE_SCALE));
[width * 0.30, width * 0.60].forEach((x) => {
  const platform = this.physics.add.staticImage(x, floatY, 'platform', 'platform_thin')
    .setScale(TILE_SCALE)
    .setOrigin(0.5, 1);
  platform.refreshBody();
  floats.add(platform);
});

// Crates act as small steps
[width * 0.12, width * 0.43, width * 0.82].forEach((x) => {
  // Position so top aligns nicely with the ground after scaling
  const crate = this.physics.add.staticImage(
    x,
    groundY - (tilePixel * TILE_SCALE - 10),
    'platform',
    'crate'
  )
    .setScale(TILE_SCALE)
    .setOrigin(0.5, 1);
  crate.refreshBody();
  floats.add(crate);
});

      // Player setup: use the loaded robot sprite. The sprite is
      // initialised with the idle frame and has an arcade physics body
      // attached automatically. We also set gravity so it can jump
      // and enable world bounds so it stays in the level.
      this.player = this.physics.add.sprite(50, height - 100, 'robot', 'idle_0');
      this.player.setCollideWorldBounds(true);
      this.player.setGravityY(300);
      this.player.anims.play('robot-idle');
      // Cursor input
      this.cursors = this.input.keyboard.createCursorKeys();
      // Group for benefit items
      this.benefits = this.physics.add.group();
      // Positions for each benefit item. Items are placed at varying
      // heights to align with floating platforms and crates. Lower
      // positions are reachable from the ground while higher ones require
      // jumping onto a floating platform.
      const positions = [
        { x: 150, y: height - 120, key: 'performance' },
        { x: 350, y: height - 250, key: 'memory' },
        { x: 550, y: height - 120, key: 'concurrency' },
        { x: 750, y: height - 250, key: 'lowlevel' },
        { x: 950, y: height - 120, key: 'integration' },
      ];
      positions.forEach((pos) => {
        // Create an invisible physics body; we'll draw shapes separately
        const item = this.benefits.create(pos.x, pos.y, null).setSize(24, 24).setOrigin(0.5);
        // Attach metadata
        item.benefitKey = pos.key;
        // Draw each item with distinct colours
        const g = this.add.graphics();
        let color;
        switch (pos.key) {
          case 'performance':
            color = 0xff595e; break;
          case 'memory':
            color = 0x8ac926; break;
          case 'concurrency':
            color = 0x1982c4; break;
          case 'lowlevel':
            color = 0xffca3a; break;
          case 'integration':
            color = 0x6a4c93; break;
        }
        g.fillStyle(color, 1);
        g.fillCircle(pos.x, pos.y, 12);
        // Label text
        this.add.text(pos.x, pos.y - 20, pos.key.charAt(0).toUpperCase() + pos.key.slice(1), {
          fontSize: '14px',
          fontFamily: 'Arial',
          color: '#ffffff',
          align: 'center'
        }).setOrigin(0.5);
      });
      // Physics collisions
      this.physics.add.collider(this.player, platforms);
      this.physics.add.collider(this.player, floats);
      this.physics.add.overlap(this.player, this.benefits, this.collectBenefit, null, this);
      // Next button (hidden until all benefits collected)
      this.nextButton = this.add.text(width - 110, height - 40, 'Next ▶', {
        fontSize: '22px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#247ba0',
        padding: { left: 10, right: 10, top: 5, bottom: 5 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      this.nextButton.visible = false;
      this.nextButton.on('pointerdown', () => {
        this.scene.start('NapiScene');
      });
    }
    update() {
      const speed = 200;
      // Horizontal movement & animations
      if (this.cursors.left.isDown) {
        this.player.setVelocityX(-speed);
        this.player.setFlipX(true);
        if (this.player.body.blocked.down) {
          this.player.anims.play('robot-walk', true);
        }
      } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(speed);
        this.player.setFlipX(false);
        if (this.player.body.blocked.down) {
          this.player.anims.play('robot-walk', true);
        }
      } else {
        this.player.setVelocityX(0);
        if (this.player.body.blocked.down) {
          this.player.anims.play('robot-idle', true);
        }
      }
      // Jump
      if (this.cursors.up.isDown && this.player.body.blocked.down) {
        this.player.setVelocityY(-320);
        this.player.anims.play('robot-jump', true);
      }
      // Falling animation
      if (!this.player.body.blocked.down && this.player.body.velocity.y > 0) {
        this.player.anims.play('robot-fall', true);
      }
    }
    collectBenefit(player, item) {
      if (gameState.benefitsCollected[item.benefitKey]) return;
      gameState.benefitsCollected[item.benefitKey] = true;
      item.destroy();
      // Display overlay with explanation of the benefit
      let title, body;
      switch (item.benefitKey) {
        case 'performance':
          title = 'Performance';
          body = 'Rust code runs close to the metal and often outperforms JavaScript for CPU‑heavy tasks. It gives you explicit control over memory and avoids costly garbage collection, providing faster operations for things like cryptography or data processing.';
          break;
        case 'memory':
          title = 'Memory Safety';
          body = 'Rust prevents common pitfalls such as null pointer dereferences and buffer overflows at compile time. Its ownership system ensures that memory is freed predictably without a garbage collector, reducing leaks and fragmentation.';
          break;
        case 'concurrency':
          title = 'Concurrency';
          body = 'The ownership and borrowing model enables fearless concurrency. Rust’s type system prevents data races, allowing you to run work in multiple threads safely and efficiently.';
          break;
        case 'lowlevel':
          title = 'Low‑level Control';
          body = 'Rust offers fine‑grained control over system resources while remaining safer than C/C++. You can write performance‑critical code (e.g. hashing, encryption) without relying on native addons written in unsafe languages.';
          break;
        case 'integration':
          title = 'Seamless Integration';
          body = 'napi‑rs makes it trivial to expose Rust functions to Node.js. It generates bindings and TypeScript definitions automatically so that your Rust code feels like a first‑class citizen in a TypeScript project.';
          break;
      }
      createOverlay(this, { title, body }).then(() => {
        // When overlay closes, check if all benefits are collected
        const allCollected = ['performance','memory','concurrency','lowlevel','integration'].every(k => gameState.benefitsCollected[k]);
        if (allCollected) {
          this.nextButton.visible = true;
        }
      });
    }
  }

  /**
   * NapiScene
   * In this scene players build a bridge between Node and Rust by pressing
   * the spacebar repeatedly. Once complete, information about napi‑rs
   * appears and the next scene becomes available.
   */
  class NapiScene extends Phaser.Scene {
    constructor() {
      super('NapiScene');
      this.buildProgress = 0;
    }
    create() {
      const { width, height } = this.scale;
      // Consistent background
      this.bg = this.add.image(0, 0, 'city_bg');
      this.bg.setOrigin(0);
      this.bg.setDisplaySize(width, height);
      this.scale.on('resize', (gameSize) => {
        const { width: w, height: h } = gameSize;
        this.bg.setDisplaySize(w, h);
      });
      // Title
      this.add.text(width / 2, 40, 'Building the Bridge', {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#ffffff'
      }).setOrigin(0.5);
      // Node side
      const nodeBox = this.add.rectangle(width * 0.25, height * 0.5, 200, 100, 0x3cba54);
      this.add.text(nodeBox.x, nodeBox.y, 'Node.js', {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#0b1e2d'
      }).setOrigin(0.5);
      // Rust side
      const rustBox = this.add.rectangle(width * 0.75, height * 0.5, 200, 100, 0xd75848);
      this.add.text(rustBox.x, rustBox.y, 'Rust', {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#0b1e2d'
      }).setOrigin(0.5);
      // Progress bar background
      this.progressBg = this.add.rectangle(width / 2, height * 0.65, 400, 20, 0x333f4f).setOrigin(0.5);
      // Progress bar foreground
      this.progressBar = this.add.rectangle(width / 2 - 200, height * 0.65, 0, 20, 0x4fd5ff).setOrigin(0, 0.5);
      // Instructions
      this.add.text(width / 2, height * 0.75, 'Press SPACE repeatedly to build the bridge', {
        fontSize: '18px',
        fontFamily: 'Arial',
        color: '#ffffff'
      }).setOrigin(0.5);
      // Space key input
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      // Next button (hidden until progress full)
      this.nextButton = this.add.text(width - 110, height - 40, 'Next ▶', {
        fontSize: '22px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#247ba0',
        padding: { left: 10, right: 10, top: 5, bottom: 5 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      this.nextButton.visible = false;
      this.nextButton.on('pointerdown', () => {
        this.scene.start('BuildScene');
      });
    }
    update() {
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        // Increase progress; clamp to 1
        this.buildProgress = Math.min(1, this.buildProgress + 0.05);
        this.progressBar.width = 400 * this.buildProgress;
        // When full, show overlay and next button
        if (this.buildProgress >= 1 && !this.overlayShown) {
          this.overlayShown = true;
          createOverlay(this, {
            title: 'napi‑rs',
            body: 'napi‑rs bridges Rust with Node.js. It generates native bindings and TypeScript definitions automatically so your Rust functions feel like any other JS API. The CLI takes care of cross‑platform compilation and packaging, making distribution easy.'
          }).then(() => {
            this.nextButton.visible = true;
          });
        }
      }
    }
  }

  /**
   * BuildScene
   * Walk along a path dotted with signposts representing the steps to build
   * and install the gic_sec module. At each signpost the game pauses
   * and displays descriptive instructions. When all steps are complete
   * the player can proceed to the examples scene.
   */
  class BuildScene extends Phaser.Scene {
    constructor() {
      super('BuildScene');
      this.stepIndex = 0;
    }
    create() {
      const { width, height } = this.scale;
      // Consistent background using the city image
      this.bg = this.add.image(0, 0, 'city_bg');
      this.bg.setOrigin(0);
      this.bg.setDisplaySize(width, height);
      this.scale.on('resize', (gameSize) => {
        const { width: w, height: h } = gameSize;
        this.bg.setDisplaySize(w, h);
      });
      // Steps text definitions based on README instructions
      this.steps = [
        {
          title: 'Initialise a package',
          body: 'Create or navigate to your Node.js project and initialise it with npm:\n\n$ npm init -y',
        },
        {
          title: 'Install napi‑rs CLI',
          body: 'Install the CLI tool globally. It scaffolds Rust addons and compiles them across platforms:\n\n$ npm install -g @napi-rs/cli',
        },
        {
          title: 'Add the Rust crate',
          body: 'Copy the gic_sec crate into your project. It contains the Rust implementation and Cargo.toml.',
        },
        {
          title: 'Build the addon',
          body: 'Run the build command from your project root. It compiles the Rust code into a native .node file:\n\n$ napi build --release',
        },
        {
          title: 'Link in package.json',
          body: 'Add a dependency in your project package.json pointing to the local crate so it can be imported in TypeScript:\n\n"gic-sec": "file:./gic_sec"',
        },
        {
          title: 'Install dependencies',
          body: 'Run npm install to install the gic_sec package and any other dependencies.',
        },
      ];
      // Build the ground using the platform tileset. This creates a solid
      // foundation across the entire width so the player can walk along
      // the signposts. Each tile is added as a static image with
      // collision enabled.
      const ground = this.physics.add.staticGroup();
      const tileSize = 32;
      const tilesWide = Math.ceil(width / tileSize) + 1;
      for (let i = 0; i < tilesWide; i++) {
        let frame = 'ground_top';
        if (i === 0) frame = 'ground_top_left';
        else if (i === tilesWide - 1) frame = 'ground_top_right';
        const tile = ground.create(i * tileSize, height, 'platform', frame);
        tile.setOrigin(0, 1);
      }
      // Player: robot sprite with physics body
      this.player = this.physics.add.sprite(50, height - 100, 'robot', 'idle_0');
      this.player.setCollideWorldBounds(true);
      this.player.setGravityY(300);
      this.player.anims.play('robot-idle');
      // Controls
      this.cursors = this.input.keyboard.createCursorKeys();
      // Signposts
      this.signposts = this.physics.add.staticGroup();
      const spacing = width / (this.steps.length + 1);
      this.steps.forEach((step, idx) => {
        const x = spacing * (idx + 1);
        const post = this.signposts.create(x, height - 70, null).setSize(20, 60);
        // Draw sign graphics
        const postGraphics = this.add.graphics();
        postGraphics.fillStyle(0x247ba0, 1);
        postGraphics.fillRect(x - 20, height - 130, 40, 40);
        this.add.text(x, height - 110, idx + 1, {
          fontSize: '18px',
          fontFamily: 'Arial',
          color: '#ffffff'
        }).setOrigin(0.5);
        post.stepIndex = idx;
      });
      // Collisions
      this.physics.add.collider(this.player, ground);
      this.physics.add.overlap(this.player, this.signposts, this.reachSign, null, this);
      // Next button (hidden until all steps done)
      this.nextButton = this.add.text(width - 110, height - 40, 'Next ▶', {
        fontSize: '22px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#247ba0',
        padding: { left: 10, right: 10, top: 5, bottom: 5 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      this.nextButton.visible = false;
      this.nextButton.on('pointerdown', () => {
        this.scene.start('ExampleScene');
      });
    }
    update() {
      const speed = 200;
      if (this.cursors.left.isDown) {
        this.player.setVelocityX(-speed);
        this.player.setFlipX(true);
        if (this.player.body.blocked.down) {
          this.player.anims.play('robot-walk', true);
        }
      } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(speed);
        this.player.setFlipX(false);
        if (this.player.body.blocked.down) {
          this.player.anims.play('robot-walk', true);
        }
      } else {
        this.player.setVelocityX(0);
        if (this.player.body.blocked.down) {
          this.player.anims.play('robot-idle', true);
        }
      }
      if (this.cursors.up.isDown && this.player.body.blocked.down) {
        this.player.setVelocityY(-320);
        this.player.anims.play('robot-jump', true);
      }
      if (!this.player.body.blocked.down && this.player.body.velocity.y > 0) {
        this.player.anims.play('robot-fall', true);
      }
    }
    reachSign(player, sign) {
      // Only trigger if we are at the current step
      if (sign.stepIndex === this.stepIndex) {
        const step = this.steps[this.stepIndex];
        this.stepIndex++;
        createOverlay(this, step).then(() => {
          if (this.stepIndex >= this.steps.length) {
            this.nextButton.visible = true;
          }
        });
      }
    }
  }

  /**
   * ExampleScene
   * Presents interactive stations where the player can explore the gic_sec
   * APIs. Each station displays a code snippet and generated output when
   * activated. After visiting all stations, the conclusion becomes available.
   */
  class ExampleScene extends Phaser.Scene {
    constructor() {
      super('ExampleScene');
    }
    create() {
      const { width, height } = this.scale;
      // Consistent background using the city image
      this.bg = this.add.image(0, 0, 'city_bg');
      this.bg.setOrigin(0);
      this.bg.setDisplaySize(width, height);
      this.scale.on('resize', (gameSize) => {
        const { width: w, height: h } = gameSize;
        this.bg.setDisplaySize(w, h);
      });
      // Title
      this.add.text(width / 2, 20, 'Explore gic_sec', {
        fontSize: '32px',
        fontFamily: 'Arial',
        color: '#ffffff'
      }).setOrigin(0.5);
      // Ground
      const ground = this.physics.add.staticGroup();
      // Build ground using tiles from the platform atlas. This replaces
      // the simple rectangle with textured tiles that span the screen.
      const tileSize = 32;
      const tilesWide = Math.ceil(width / tileSize) + 1;
      for (let i = 0; i < tilesWide; i++) {
        let frame = 'ground_top';
        if (i === 0) frame = 'ground_top_left';
        else if (i === tilesWide - 1) frame = 'ground_top_right';
        const tile = ground.create(i * tileSize, height, 'platform', frame);
        tile.setOrigin(0, 1);
      }
      // Player: robot sprite with physics body
      this.player = this.physics.add.sprite(60, height - 100, 'robot', 'idle_0');
      this.player.setCollideWorldBounds(true);
      this.player.setGravityY(300);
      this.player.anims.play('robot-idle');
      // Controls
      this.cursors = this.input.keyboard.createCursorKeys();
      // Stations definitions
      this.stations = [
        {
          key: 'jwt',
          label: 'JWT Encode/Decode',
          code: `const payload = { sub: '12345', role: 'admin', exp: Math.floor(Date.now()/1000) + 3600 };
const secret = 'my_super_secret_key';
const token = gic.encodeJwt(JSON.stringify(payload), secret, 'HS512');
const decoded = gic.decodeJwt(token, secret, true);
console.log(token);\nconsole.log(decoded);`,
          run: () => {
            const payload = { sub: '12345', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 };
            const token = btoa(JSON.stringify(payload));
            const decoded = JSON.stringify(payload);
            return `Signed token: ${token}\nDecoded claims: ${decoded}`;
          }
        },
        {
          key: 'password',
          label: 'Generate Password',
          code: `// generatePassword(length, upper, lower, digits, symbols)
const pwd = gic.generatePassword(16, true, true, true, '#*+');
console.log(pwd);`,
          run: () => {
            function generatePassword(len, upper, lower, digits, symbols) {
              const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
              const lowers = 'abcdefghijklmnopqrstuvwxyz';
              const nums = '0123456789';
              const sym = symbols;
              let chars = '';
              if (upper) chars += uppers;
              if (lower) chars += lowers;
              if (digits) chars += nums;
              if (sym) chars += sym;
              let result = '';
              for (let i = 0; i < len; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              return result;
            }
            return generatePassword(16, true, true, true, '#*+');
          }
        },
        {
          key: 'hashing',
          label: 'SHA‑256 & SHA‑512',
          code: `const sha256 = gic.hashSha256('hello world');
const sha512 = gic.hashSha512('hello world');
console.log(sha256);\nconsole.log(sha512);`,
          run: async () => {
            const encoder = new TextEncoder();
            const data = encoder.encode('hello world');
            const hash256 = await crypto.subtle.digest('SHA-256', data);
            const hash512 = await crypto.subtle.digest('SHA-512', data);
            function hex(buffer) {
              return Array.from(new Uint8Array(buffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            }
            return `SHA-256: ${hex(hash256)}\nSHA-512: ${hex(hash512)}`;
          }
        },
        {
          key: 'random',
          label: 'Random base64 & UUID',
          code: `const token = gic.randomBase64(32);
const uuid = gic.generateUuidV4();
console.log(token);\nconsole.log(uuid);`,
          run: () => {
            // Random base64
            const bytes = new Uint8Array(32);
            crypto.getRandomValues(bytes);
            const base64 = btoa(String.fromCharCode(...bytes));
            // UUID v4 generator
            const uuid = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
              (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
            return `Random base64: ${base64}\nUUID v4: ${uuid}`;
          }
        }
      ];
      // Stations physics bodies
      this.stationBodies = this.physics.add.staticGroup();
      const stationSpacing = width / (this.stations.length + 1);
      this.stations.forEach((station, idx) => {
        const x = stationSpacing * (idx + 1);
        const body = this.stationBodies.create(x, height - 70, null).setSize(40, 60);
        body.stationKey = station.key;
        // Draw station base
        const sg = this.add.graphics();
        sg.fillStyle(0x247ba0, 1);
        sg.fillRect(x - 30, height - 130, 60, 60);
        // Label
        this.add.text(x, height - 100, station.label, {
          fontSize: '14px',
          fontFamily: 'Arial',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: 120 }
        }).setOrigin(0.5);
      });
      // Collisions
      this.physics.add.collider(this.player, ground);
      this.physics.add.overlap(this.player, this.stationBodies, this.visitStation, null, this);
      // Next button after all visited
      this.nextButton = this.add.text(width - 110, height - 40, 'Finish ▶', {
        fontSize: '22px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#247ba0',
        padding: { left: 10, right: 10, top: 5, bottom: 5 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      this.nextButton.visible = false;
      this.nextButton.on('pointerdown', () => {
        this.scene.start('ConclusionScene');
      });
    }
    update() {
      const speed = 200;
      if (this.cursors.left.isDown) {
        this.player.setVelocityX(-speed);
        this.player.setFlipX(true);
        if (this.player.body.blocked.down) {
          this.player.anims.play('robot-walk', true);
        }
      } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(speed);
        this.player.setFlipX(false);
        if (this.player.body.blocked.down) {
          this.player.anims.play('robot-walk', true);
        }
      } else {
        this.player.setVelocityX(0);
        if (this.player.body.blocked.down) {
          this.player.anims.play('robot-idle', true);
        }
      }
      if (this.cursors.up.isDown && this.player.body.blocked.down) {
        this.player.setVelocityY(-320);
        this.player.anims.play('robot-jump', true);
      }
      if (!this.player.body.blocked.down && this.player.body.velocity.y > 0) {
        this.player.anims.play('robot-fall', true);
      }
    }
    visitStation(player, stationBody) {
      const key = stationBody.stationKey;
      if (gameState.examplesVisited[key]) return;
      gameState.examplesVisited[key] = true;
      // Find the station definition
      const station = this.stations.find(s => s.key === key);
      // Execute the example; handle async results
      const result = station.run();
      const showOverlay = (output) => {
        createOverlay(this, {
          title: station.label,
          body: 'Here is how you use the API:',
          code: station.code,
          output
        }).then(() => {
          // After overlay closes, check if all visited
          const allVisited = this.stations.every(s => gameState.examplesVisited[s.key]);
          if (allVisited) {
            this.nextButton.visible = true;
          }
        });
      };
      if (result instanceof Promise) {
        result.then(showOverlay);
      } else {
        showOverlay(String(result));
      }
    }
  }

  /**
   * ConclusionScene
   * Summarises the adventure and encourages adoption of custom modules.
   */
  class ConclusionScene extends Phaser.Scene {
    constructor() {
      super('ConclusionScene');
    }
    create() {
      const { width, height } = this.scale;
      // Consistent background across scenes
      this.bg = this.add.image(0, 0, 'city_bg');
      this.bg.setOrigin(0);
      this.bg.setDisplaySize(width, height);
      this.scale.on('resize', (gameSize) => {
        const { width: w, height: h } = gameSize;
        this.bg.setDisplaySize(w, h);
      });
      // Title
      this.add.text(width / 2, 60, 'Congratulations!', {
        fontSize: '40px',
        fontFamily: 'Arial',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      // Summary text
      const summary =
        'You have discovered why Rust makes Node.js stronger: blazing fast performance,\n' +
        'memory safety without garbage collection, fearless concurrency and seamless integration\n' +
        'with napi‑rs. You walked through the build process and explored the gic_sec API.\n\n' +
        'By creating your own native modules, you empower your TypeScript codebase with the\n' +
        'speed and reliability of Rust. It keeps sensitive operations on the client and\n' +
        'avoids sending secrets to remote services. Adopt this culture and level up your\n' +
        'development workflow!';
      this.add.text(width / 2, height / 2, summary, {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#aeeaff',
        align: 'center',
        wordWrap: { width: width * 0.8 }
      }).setOrigin(0.5);
      // Exit button
      const exitButton = this.add.text(width / 2, height - 80, 'Play Again', {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#247ba0',
        padding: { left: 20, right: 20, top: 10, bottom: 10 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      exitButton.on('pointerdown', () => {
        // Reset state for another run
        gameState.benefitsCollected = {};
        gameState.examplesVisited = {};
        this.scene.start('TitleScene');
      });
    }
  }

  // Phaser game configuration
  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    // Make the game responsive. RESIZE allows the game canvas to match
    // the parent container dimensions. AutoCenter ensures the canvas is
    // centered when aspect ratios differ.
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, TitleScene, BenefitScene, NapiScene, BuildScene, ExampleScene, ConclusionScene],
  };

  // Start the game
  new Phaser.Game(config);
})();