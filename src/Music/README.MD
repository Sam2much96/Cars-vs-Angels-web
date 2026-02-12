# Audio Worklet Implementation for Music System

## Overview

This implementation moves audio playback from the main thread to a dedicated audio rendering thread using the Web Audio API's Audio Worklet feature. This prevents audio lag and stuttering that can occur when the main thread is busy with game logic.

## Architecture

### 1. **music-worklet-processor.js**

The processor runs on the audio rendering thread and:

- Receives audio buffers from the main thread
- Streams audio data frame-by-frame to the audio output
- Handles loop playback
- Sends position updates and ended events back to main thread

### 2. **Music.ts**

The updated Music class:

- Initializes the Audio Worklet on construction
- Renders music using zzfxM (still on main thread, but deferred)
- Sends rendered buffers to the worklet for playback
- Provides control methods (pause, resume, stop, seek)

## Key Benefits

✅ **No audio lag** - Playback happens on audio thread, isolated from main thread
✅ **Smooth gameplay** - Main thread is free for game logic
✅ **Better timing** - Audio synced to hardware clock, not browser frame rate
✅ **Position tracking** - Real-time playback position updates
✅ **Automatic track transitions** - Handles track endings smoothly

## File Structure

### TypeScript Version (Recommended)

```
your-project/
├── src/
│   ├── Music-typed.ts                    # Fully typed Music class
│   ├── music-worklet-processor.ts        # TypeScript worklet processor
│   └── tsconfig.worklet.json             # Worklet build config
└── public/
    └── music-worklet-processor.js        # Compiled worklet (build output)
```

### JavaScript Version with Types

```
your-project/
├── src/
│   ├── Music-typed.ts                    # Typed Music class
│   ├── music-worklet-processor.d.ts      # Type declarations
│   └── music-worklet-processor.js        # Plain JS worklet
└── public/
    └── music-worklet-processor.js        # Copy here for web access
```

## Setup Instructions

1. **Copy the worklet file to your public directory:**

   ```bash
   cp music-worklet-processor.js public/
   ```

2. **Update the worklet path in Music.ts if needed:**

   ```typescript
   await this.audioContext.audioWorklet.addModule(
     "./music-worklet-processor.js",
   );
   ```

   Adjust this path based on where you serve the file from.

3. **Ensure CORS headers are set** if serving from a different origin.

## Usage

The API remains mostly the same, with added control methods:

```typescript
const music = new Music();

// Music plays automatically, but you can control it:
music.pause(); // Pause playback
music.resume(); // Resume playback
music.stop(); // Stop and reset to beginning
music.seek(44100); // Seek to position (in samples)
music.setLoop(true); // Enable/disable looping
```

## Message Protocol

**Main Thread → Worklet:**

- `SET_BUFFER` - Send audio buffer data
- `PLAY` - Start playback
- `PAUSE` - Pause playback
- `STOP` - Stop and reset
- `SET_LOOP` - Enable/disable looping
- `SEEK` - Jump to position

**Worklet → Main Thread:**

- `ENDED` - Track finished playing
- `POSITION_UPDATE` - Current playback position (~100ms intervals)

## Performance Notes

- **Rendering still on main thread**: The zzfxM rendering is still deferred on the main thread (50ms timeout). This could be further optimized by moving rendering to a Web Worker if needed.

- **Buffer transfer**: Audio buffers are copied to the worklet using `postMessage`. For very large buffers, consider using `SharedArrayBuffer` or `ArrayBuffer.transfer()` for zero-copy transfer.

- **Position updates**: Position is reported every ~100ms (4410 samples at 44.1kHz). Adjust the interval in the processor if needed.

## Browser Compatibility

Audio Worklet is supported in:

- Chrome 66+
- Firefox 76+
- Safari 14.1+
- Edge 79+

For older browsers, you'd need to fall back to ScriptProcessorNode (deprecated) or keep using the original zzfxP implementation.

## Troubleshooting

**Worklet fails to load:**

- Check that the file path is correct and publicly accessible
- Verify CORS headers if loading from different origin
- Check browser console for detailed error messages

**No audio output:**

- Ensure `audioContext.resume()` is called (required by browser autoplay policies)
- Verify that the worklet is connected to `destination`
- Check that buffers are being sent correctly

**Position tracking not working:**

- Ensure you're listening to the `port.onmessage` events
- Check that position updates are being sent (every 4410 samples)

## Future Enhancements

1. **Move rendering to Web Worker**: Offload zzfxM rendering completely
2. **Crossfade between tracks**: Smooth transitions
3. **Volume control**: Add gain parameter to worklet
4. **Visualization**: Export audio data for visualizers
5. **Preloading**: Load next track while current is playing

# Building TypeScript Audio Worklets

## The Challenge

Audio Worklet processors run in a special isolated scope that doesn't have access to ES modules or bundler features. This means you need to compile TypeScript worklets to plain JavaScript without any module system.

## Option 1: TypeScript Native Worklet (Recommended)

Use the TypeScript version and compile it separately from your main bundle.

### tsconfig.worklet.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020", "WebWorker"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": false,
    "outDir": "./public",
    "rootDir": "./src"
  },
  "include": ["music-worklet-processor.ts"]
}
```

### Build Command

```bash
# Compile the worklet separately
tsc --project tsconfig.worklet.json

# Or add to package.json scripts:
{
  "scripts": {
    "build:worklet": "tsc --project tsconfig.worklet.json",
    "build": "npm run build:worklet && vite build"
  }
}
```

### File Structure

```
src/
├── Music.ts                       # Main music class
├── music-worklet-processor.ts     # Worklet source (TypeScript)
└── tsconfig.worklet.json          # Worklet-specific TS config

public/
└── music-worklet-processor.js     # Compiled output (git-ignored)
```

## Option 2: Keep JavaScript + Type Declarations

Keep the original `music-worklet-processor.js` and use `music-worklet-processor.d.ts` for type safety.

### Project Structure

```
src/
├── Music.ts                          # Imports types from .d.ts
├── music-worklet-processor.d.ts      # Type declarations
└── types.d.ts                        # Module declaration

public/
└── music-worklet-processor.js        # Plain JS (committed to git)
```

### src/types.d.ts

```typescript
// Declare the worklet module so TypeScript knows about it
declare module "./music-worklet-processor" {
  export * from "./music-worklet-processor.d.ts";
}
```

### Usage in Music.ts

```typescript
import type { WorkletOutputMessage } from "./music-worklet-processor";

// TypeScript will now validate message types
node.port.onmessage = (event: MessageEvent<WorkletOutputMessage>) => {
  // Fully typed!
};
```

## Option 3: Vite/Webpack Plugin

For bundler integration, you can use a plugin to handle worklets.

### Vite Config

```typescript
// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  worker: {
    format: "es", // Use ES modules for workers
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        worklet: "src/music-worklet-processor.ts",
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "worklet") {
            return "music-worklet-processor.js";
          }
          return "[name]-[hash].js";
        },
      },
    },
  },
});
```

### Import as URL (Vite-specific)

```typescript
import workletUrl from "./music-worklet-processor.ts?url";

await this.audioContext.audioWorklet.addModule(workletUrl);
```

## Option 4: Inline Worklet (No Separate File)

For simple cases, you can inline the worklet code.

```typescript
const workletCode = `
class MusicWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (event) => {
      // Worklet code here...
    };
  }
  
  process(inputs, outputs, parameters) {
    // Process audio...
    return true;
  }
}
registerProcessor('music-worklet-processor', MusicWorkletProcessor);
`;

const blob = new Blob([workletCode], { type: "application/javascript" });
const workletUrl = URL.createObjectURL(blob);

await this.audioContext.audioWorklet.addModule(workletUrl);
URL.revokeObjectURL(workletUrl); // Clean up
```

## Recommended Approach

**For most projects**: Use **Option 1** (TypeScript native worklet)

- Full type safety
- Separate compilation
- Clean separation of concerns
- Easy to maintain

**For simple projects**: Use **Option 2** (JS + .d.ts)

- No build step needed for worklet
- Still get type safety in main code
- Easier deployment

**For advanced bundler setups**: Use **Option 3** (Vite/Webpack plugin)

- Integrated build process
- Hot reloading during development
- Automatic optimization

## Common Pitfalls

1. **Don't use imports in worklets** - They run in an isolated scope
2. **Remember the .js extension** - Even if source is .ts, load as .js after compilation
3. **CORS issues** - Worklet must be same-origin or have proper CORS headers
4. **Module format** - Use ES2020 target, not CommonJS
5. **No bundler features** - No dynamic imports, no process.env, etc.

## Type Safety Benefits

With proper TypeScript setup, you get:

✅ Autocomplete for message types
✅ Compile-time validation of message structure  
✅ Refactoring safety across worklet boundary
✅ Documentation via types
✅ Catch errors before runtime
