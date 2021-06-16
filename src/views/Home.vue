<template>
  <section>
    <canvas></canvas>
    <nav v-if="hints">
      <h2>HINTS</h2>
      <div>- SHARE URL TO COLLAB</div>
      <div>- USE MOUSE TO DRAW</div>
      <div>- <kbd>Ctrl+S</kbd> TO SAVE</div>
      <div>- <kbd>Ctrl+X</kbd> TO CLEAR</div>
    </nav>
  </section>
</template>

<style lang="scss" scoped>
  canvas {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: transparent;
  }

  nav {
    position: absolute;
    top: 50%;
    left: 50%;
    color: var(--fore);
    font-size: 2rem;
    font-family: monospace;
    transform: translate(-50%, -50%);
    z-index: -1;

    h2 {
      margin: 0;
      text-align: center;
    }

    kbd {
      color: var(--primary);
    }
  }
</style>

<script>
import shortid from 'shortid'
import io from 'socket.io-client'

export default {
  data () {
    return {
      id: null,
      socket: null,
      paint: false,
      audio: null,
      canvas: null,
      ctx: null,
      hints: true,
      coord: { x: 0, y: 0 },
      screen: { x: 0, y: 0 },
      config: { primary: null, secondary: null }
    }
  },
  mounted () {
    if (this.$route.path === '/') this.$router.replace(shortid())
    this.id = this.$route.path.substr(1)
    this.socket = io(process.env.VUE_APP_SERVER, { transports: ['websocket'] })
    this.socket.on('message', this.ioParser)
    this.socket.emit('enter', this.id)
    this.audio = new Audio('/sounds/tab.mp3')
    this.canvas = document.querySelector('canvas')
    this.ctx = this.canvas.getContext('2d')
    this.config.primary = getComputedStyle(document.body).getPropertyValue('--primary')
    this.config.secondary = getComputedStyle(document.body).getPropertyValue('--secondary')
    document.addEventListener('keydown', this.keyParser)
    document.addEventListener('mousedown', this.startPainting)
    document.addEventListener('mouseup', this.stopPainting)
    document.addEventListener('mousemove', this.sketch)
    window.addEventListener('resize', this.resize)
    this.resize()
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this.keyParser)
    document.removeEventListener('mousedown', this.startPainting)
    document.removeEventListener('mouseup', this.stopPainting)
    document.removeEventListener('mousemove', this.sketch)
    window.removeEventListener('resize', this.resize)
    this.socket.disconnect()
  },
  methods: {
    play () {
      this.audio.currentTime = 0
      this.audio.play()
    },
    ioParser (meta) {
      if (meta.event === 'clean') return this.clean(false)
      if (meta.event === 'draw') return this.remoteSketch(meta.data)
    },
    keyParser (event) {
      if (!event.ctrlKey) return
      if (event.key.toLowerCase() === 'x') {
        event.preventDefault()
        this.clean()
      } else if (event.key.toLowerCase() === 's') {
        event.preventDefault()
        this.save()
      }
    },
    save () {
      this.play()
      const anchor = document.createElement('a')
      anchor.setAttribute('href', this.canvas.toDataURL('image/png'))
      anchor.setAttribute('download', 'board.png')
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
    },
    clean (propagate = true) {
      this.play()
      this.resize()
      if (!propagate) return
      this.socket.send({ event: 'clean', room: this.id })
    },
    resize () {
      this.hints = true
      this.screen = { x: window.innerWidth, y: window.innerHeight }
      this.ctx.canvas.width = window.innerWidth
      this.ctx.canvas.height = window.innerHeight
    },
    getPosition (event) {
      this.coord.x = event.clientX - this.canvas.offsetLeft
      this.coord.y = event.clientY - this.canvas.offsetTop
    },
    startPainting (event) {
      this.paint = true
      this.getPosition(event)
    },
    stopPainting () {
      this.paint = false
    },
    sketch (event) {
      if (!this.paint) return
      this.hints = false
      const data = []
      this.ctx.beginPath()
      this.ctx.lineWidth = 2
      this.ctx.lineCap = 'round'
      this.ctx.strokeStyle = this.config.secondary
      this.ctx.moveTo(this.coord.x, this.coord.y)
      data.push(this.coord.x / this.screen.x, this.coord.y / this.screen.y)
      this.getPosition(event)
      this.ctx.lineTo(this.coord.x, this.coord.y)
      data.push(this.coord.x / this.screen.x, this.coord.y / this.screen.y)
      this.socket.send({ event: 'draw', room: this.id, data })
      this.ctx.stroke()
    },
    remoteSketch ([ix, iy, fx, fy]) {
      this.hints = false
      this.ctx.beginPath()
      this.ctx.lineWidth = 2
      this.ctx.lineCap = 'round'
      this.ctx.strokeStyle = this.config.primary
      this.ctx.moveTo(ix * this.screen.x, iy * this.screen.y)
      this.ctx.lineTo(fx * this.screen.x, fy * this.screen.y)
      this.ctx.stroke()
    }
  }
}
</script>
