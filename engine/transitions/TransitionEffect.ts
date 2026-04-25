/**
 * A pluggable composite-pass shader that blends the 2D and 3D layer textures.
 * `progress` runs 0..1 from "fully showing prev blend" to "fully showing target".
 */
export interface TransitionEffect {
  readonly name: string;
  readonly fragmentShader: string;
}
