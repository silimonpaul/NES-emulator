class WebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    
    // Try different WebGL contexts
    this.gl = canvas.getContext("webgl2") || 
              canvas.getContext("webgl") || 
              canvas.getContext("experimental-webgl");
              
    if (!this.gl) {
      throw new Error("WebGL not supported - please use a WebGL-compatible browser");
    }

    // Rest of your WebGL initialization
    this.initShaders();
    this.initBuffers();
    this.texture = this.createTexture();
    this.setupGL();
  }

  setupGL() {
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    this.gl.disable(this.gl.DEPTH_TEST);
    this.gl.disable(this.gl.BLEND);
  }

  initShaders() {
    const vertexShader = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            void main() {
                gl_Position = vec4(a_position, 0, 1);
                v_texCoord = a_texCoord;
            }
        `;

    const fragmentShader = `
            precision mediump float;
            uniform sampler2D u_image;
            varying vec2 v_texCoord;
            void main() {
                vec4 color = texture2D(u_image, v_texCoord);
                // NES color correction
                color.rgb *= 1.2;
                color.rgb = pow(color.rgb, vec3(1.0 / 2.2));
                gl_FragColor = color;
            }
        `;

    const vertShader = this.compileShader(vertexShader, this.gl.VERTEX_SHADER);
    const fragShader = this.compileShader(
      fragmentShader,
      this.gl.FRAGMENT_SHADER
    );

    this.program = this.gl.createProgram();
    this.gl.attachShader(this.program, vertShader);
    this.gl.attachShader(this.program, fragShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(this.program);
      throw new Error("Shader program link error: " + info);
    }

    this.gl.useProgram(this.program);
  }

  compileShader(source, type) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error("Shader compile error: " + info);
    }
    return shader;
  }

  initBuffers() {
    // Full screen quad
    const positions = new Float32Array([
      -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
    ]);

    // Texture coordinates
    const texCoords = new Float32Array([
      0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0,
    ]);

    // Position buffer
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    const positionLocation = this.gl.getAttribLocation(
      this.program,
      "a_position"
    );
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(
      positionLocation,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );

    // Texture coordinate buffer
    this.texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);

    const texCoordLocation = this.gl.getAttribLocation(
      this.program,
      "a_texCoord"
    );
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.vertexAttribPointer(
      texCoordLocation,
      2,
      this.gl.FLOAT,
      false,
      0,
      0
    );
  }

  createTexture() {
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    // Set texture parameters
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_S,
      this.gl.CLAMP_TO_EDGE
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_WRAP_T,
      this.gl.CLAMP_TO_EDGE
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MIN_FILTER,
      this.gl.NEAREST
    );
    this.gl.texParameteri(
      this.gl.TEXTURE_2D,
      this.gl.TEXTURE_MAG_FILTER,
      this.gl.NEAREST
    );

    // Initialize empty texture
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      256,
      240,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      null
    );

    return texture;
  }

  render(frameData) {
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Update texture with new frame data
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D,
      0,
      0,
      0,
      256,
      240,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      frameData
    );

    // Draw the frame
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  destroy() {
    if (this.gl) {
      this.gl.deleteProgram(this.program);
      this.gl.deleteBuffer(this.positionBuffer);
      this.gl.deleteBuffer(this.texCoordBuffer);
      this.gl.deleteTexture(this.texture);
    }
  }

  resize() {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }
}
