const http = require('http')
const server = http.createServer(router)
const io = require('socket.io')(server)

function router (req, res) {
  res.end('SYNC SERVER')
}

io.on('connection', socket => {
  socket.on('enter', room => socket.join(room))
  socket.on('message', meta => socket.to(meta.room).send(meta))
})

server.listen(process.env.PORT)
