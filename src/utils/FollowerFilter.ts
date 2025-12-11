import { Filter, GlProgram, GpuProgram } from 'pixi.js';

const vertex = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

const fragment = `
in vec2 vTextureCoord;
in vec4 vColor;
out vec4 finalColor;

uniform sampler2D uTexture;

void main(void)
{
    vec4 color = texture(uTexture, vTextureCoord);

    // Purple color target
    vec3 purple = vec3(0.6, 0.0, 0.8);

    // Mix original color with purple, scaling purple by alpha for premultiplied correctness
    // color.rgb is already premultiplied (rgb * a)
    // We want to mix (rgb * a) with (purple * a)
    vec3 targetColor = purple * color.a;
    vec3 mixed = mix(color.rgb, targetColor, 0.5);

    finalColor = vec4(mixed, color.a);
}
`;

const source = `
struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

struct VSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>
};

@vertex
fn mainVertex(@location(0) aPosition : vec2<f32>) -> VSOutput {
  var positions = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;
  positions.x = positions.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
  positions.y = positions.y * (2.0 * gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

  var uv = aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);

  return VSOutput(vec4<f32>(positions, 0.0, 1.0), uv);
}

@fragment
fn mainFragment(@location(0) uv : vec2<f32>) -> @location(0) vec4<f32> {
  var color = textureSample(uTexture, uSampler, uv);
  var purple = vec3<f32>(0.6, 0.0, 0.8);
  var targetColor = purple * color.a;
  var mixed = mix(color.rgb, targetColor, 0.5);
  return vec4<f32>(mixed, color.a);
}
`;

export class FollowerFilter extends Filter {
  constructor() {
    super({
      glProgram: new GlProgram({
        vertex,
        fragment,
      }),
      gpuProgram: new GpuProgram({
        vertex: {
          source,
          entryPoint: 'mainVertex',
        },
        fragment: {
          source,
          entryPoint: 'mainFragment',
        },
      }),
      resources: {}
    });
  }
}
