import * as socketio from 'socket.io';
import * as lodash from 'lodash';
import * as server from './server';

const io = socketio.listen(server);

interface USER {
  id: string;
  roomId: string;
  socket: socketio.Socket;
}

interface MESSAGE {
  body: string;
  isSystemMessage: boolean;
  timestamp: Date;
  userId: string;
}

interface STATE {
  title: string;
  duration: number;
  last_updated: number;
  is_playing: boolean;
  position: number;
}

interface ROOM {
  id: string;
  messages: MESSAGE[];
  userIds: string[];
  ownerId: string;
  state: STATE;
}

const users: Record<string, USER> = {};
const rooms: Record<string, ROOM> = {};

const makeId = () => {
  let result = '';
  const hexChars = '0123456789abcdef';
  for (let i = 0; i < 16; i += 1) {
    result += hexChars[Math.floor(Math.random() * 16)];
  }
  return result;
};

const validateId = (id: string) => {
  return typeof id === 'string' && id.length === 16;
};

const validateLastKnownTime = (lastKnownTime: number) => {
  return (
    typeof lastKnownTime === 'number' &&
    lastKnownTime % 1 === 0 &&
    lastKnownTime >= 0
  );
};

const validateBoolean = (boolean: boolean) => {
  return typeof boolean === 'boolean';
};

const validateAudioId = (audioId: string) => {
  return typeof audioId === 'string';
};

io.on('connection', (socket: socketio.Socket) => {
  let userId: string = makeId();
  while (Object.prototype.hasOwnProperty.call(users, userId)) {
    userId = makeId();
  }
  users[userId] = {
    id: userId,
    roomId: '',
    socket: socket,
  };
  socket.emit('userId', userId);
  console.log('User ' + userId + ' connected.');

  const sendMessage = (body: string, isSystemMessage: boolean) => {
    const message: MESSAGE = {
      body: body,
      isSystemMessage: isSystemMessage,
      timestamp: new Date(),
      userId: userId,
    };
    rooms[users[userId].roomId].messages.push(message);

    console.log('Sending message in room ' + users[userId].roomId + '.');
    io.sockets.in(users[userId].roomId).emit('sendMessage', {
      body: message.body,
      isSystemMessage: isSystemMessage,
      timestamp: message.timestamp.getTime(),
      userId: message.userId,
    });
  };

  const leaveRoom = () => {
    sendMessage('left', true);
    const roomId = users[userId].roomId;
    socket.leave(roomId);
    lodash.pull(rooms[roomId].userIds, userId);
    users[userId].roomId = '';

    if (rooms[roomId].userIds.length === 0) {
      delete rooms[roomId];
      console.log(
        `Room ${roomId} was deleted because there were no more users in it.`
      );
    }
  };

  socket.on('createRoom', (data: Record<string, string>) => {
    if (!Object.prototype.hasOwnProperty.call(users, userId)) {
      //inform
      console.log('The socket received a message after it was disconnected.');
      return;
    }

    if (!validateAudioId(data.title)) {
      //inform
      console.log(
        `User ${userId} attempted to create room with invalid audio ${data.title}.`
      );
      return;
    }

    let roomId = makeId();
    while (Object.prototype.hasOwnProperty.call(rooms, roomId)) {
      roomId = makeId();
    }
    const initial_state: STATE = {
      is_playing: false,
      position: 0,
      last_updated: 0,
      title: data.title,
      duration: 0,
    };
    const room = {
      id: roomId,
      messages: [],
      state: initial_state,
      userIds: [userId],
      ownerId: userId,
    };
    users[userId].roomId = roomId;
    rooms[room.id] = room;
    socket.join(roomId);
    sendMessage('created the room', true);
    console.log('User ' + userId + ' created room ' + users[userId].roomId);
  });

  socket.on('joinRoom', (data: Record<string, string>) => {
    const roomId = data.roomId;
    if (!Object.prototype.hasOwnProperty.call(users, userId)) {
      //inform
      console.log('The socket received a message after it was disconnected.');
      return;
    }

    if (
      !validateId(roomId) ||
      !Object.prototype.hasOwnProperty.call(rooms, roomId)
    ) {
      //inform
      console.log(
        `User ${userId} attempted to join nonexistent room ${roomId}.`
      );
      return;
    }

    if (users[userId].roomId !== '') {
      //inform
      console.log(
        `User ${userId} attempted to join room ${roomId}, but the user is already in room ${users[userId].roomId}.`
      );
      return;
    }

    users[userId].roomId = roomId;
    rooms[roomId].userIds.push(userId);
    socket.join(roomId);
    sendMessage('joined', true);
    console.log('User ' + userId + ' joined room ' + roomId + '.');
  });

  socket.on('leaveRoom', () => {
    if (!Object.prototype.hasOwnProperty.call(users, userId)) {
      //inform
      console.log('The socket received a message after it was disconnected.');
      return;
    }

    if (users[userId].roomId === '') {
      //inform
      console.log(
        `User ${userId} attempted to leave a room, but the user was not in one.`
      );
      return;
    }

    const roomId = users[userId].roomId;
    leaveRoom();
    console.log('User ' + userId + ' left room ' + roomId + '.');
  });

  socket.on('pause', (data: STATE) => {
    if (!Object.prototype.hasOwnProperty.call(users, userId)) {
      //inform
      console.log('The socket received a message after it was disconnected.');
      return;
    }

    if (users[userId].roomId === '') {
      //inform
      console.log(
        `User ${userId} attempted to update a room, but the user was not in one.`
      );
      return;
    }

    if (!validateLastKnownTime(data.position)) {
      //inform
      console.log(
        `User ${userId} attempted to update room 
        ${users[userId].roomId} with invalid lastKnownTime 
        ${data.position}.`
      );
      return;
    }

    if (!validateBoolean(data.is_playing)) {
      //inform
      console.log(
        `User ${userId} attempted to update room ${
          users[userId].roomId
        } with invalid state ${JSON.stringify(data)}.`
      );
      return;
    }

    if (
      rooms[users[userId].roomId].ownerId !== '' &&
      rooms[users[userId].roomId].ownerId !== userId
    ) {
      //inform
      console.log(
        `User ${userId} attempted to update room ${
          users[userId].roomId
        } but the room is locked by ${rooms[users[userId].roomId].ownerId}.`
      );
      return;
    }

    rooms[users[userId].roomId].state = data;

    console.log(
      `User ${userId} paused roomId ${users[userId].roomId} at ${data.position} on epoch ${data.last_updated}.`
    );
    socket
      .to(users[userId].roomId)
      .emit('pause', rooms[users[userId].roomId].state);
  });

  socket.on('play', (data: STATE) => {
    if (!Object.prototype.hasOwnProperty.call(users, userId)) {
      //inform
      console.log('The socket received a message after it was disconnected.');
      return;
    }

    if (users[userId].roomId === '') {
      //inform
      console.log(
        `User ${userId} attempted to update a room, but the user was not in one.`
      );
      return;
    }

    if (!validateLastKnownTime(data.position)) {
      //inform
      console.log(
        `User ${userId} attempted to update room 
        ${users[userId].roomId} with invalid lastKnownTime 
        ${data.position}.`
      );
      return;
    }

    if (!validateBoolean(data.is_playing)) {
      //inform
      console.log(
        `User ${userId} attempted to update room ${
          users[userId].roomId
        } with invalid state ${JSON.stringify(data)}.`
      );
      return;
    }

    if (
      rooms[users[userId].roomId].ownerId !== '' &&
      rooms[users[userId].roomId].ownerId !== userId
    ) {
      //inform
      console.log(
        `User ${userId} attempted to update room ${
          users[userId].roomId
        } but the room is locked by ${rooms[users[userId].roomId].ownerId}.`
      );
      return;
    }

    rooms[users[userId].roomId].state = data;

    console.log(
      `User ${userId} paused roomId ${users[userId].roomId} at ${data.position} on epoch ${data.last_updated}.`
    );
    socket
      .to(users[userId].roomId)
      .emit('play', rooms[users[userId].roomId].state);
  });

  socket.on('seek', (data: STATE) => {
    if (!Object.prototype.hasOwnProperty.call(users, userId)) {
      //inform
      console.log('The socket received a message after it was disconnected.');
      return;
    }

    if (users[userId].roomId === '') {
      //inform
      console.log(
        `User ${userId} attempted to update a room, but the user was not in one.`
      );
      return;
    }

    if (!validateLastKnownTime(data.position)) {
      //inform
      console.log(
        `User ${userId} attempted to update room 
        ${users[userId].roomId} with invalid lastKnownTime 
        ${data.position}.`
      );
      return;
    }

    if (!validateBoolean(data.is_playing)) {
      //inform
      console.log(
        `User ${userId} attempted to update room ${
          users[userId].roomId
        } with invalid state ${JSON.stringify(data)}.`
      );
      return;
    }

    if (
      rooms[users[userId].roomId].ownerId !== '' &&
      rooms[users[userId].roomId].ownerId !== userId
    ) {
      //inform
      console.log(
        `User ${userId} attempted to update room ${
          users[userId].roomId
        } but the room is locked by ${rooms[users[userId].roomId].ownerId}.`
      );
      return;
    }

    rooms[users[userId].roomId].state = data;

    console.log(
      `User ${userId} paused roomId ${users[userId].roomId} at ${data.position} on epoch ${data.last_updated}.`
    );
    socket
      .to(users[userId].roomId)
      .emit('seek', rooms[users[userId].roomId].state);
  });

  socket.on('disconnect', () => {
    if (!Object.prototype.hasOwnProperty.call(users, userId)) {
      console.log('The socket received a message after it was disconnected.');
      return;
    }

    if (users[userId].roomId !== null) {
      leaveRoom();
    }
    delete users[userId];
    console.log('User ' + userId + ' disconnected.');
  });
});
