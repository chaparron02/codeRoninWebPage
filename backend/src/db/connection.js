import mongoose from 'mongoose';

const TIMEOUT_MS = 3000;

const state = {
  ready: false,
  mode: 'none',
  uri: null,
  dbName: null,
};

export async function connectDatabase({ uri, dbName }) {
  // Enfoque estricto: sin fallback a memoria. Si falla, se lanza error.
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: TIMEOUT_MS,
    connectTimeoutMS: TIMEOUT_MS,
    socketTimeoutMS: TIMEOUT_MS,
  });
  state.ready = true;
  state.mode = 'external';
  state.uri = uri;
  state.dbName = dbName;
  return state;
}

export async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
  } finally {
    state.ready = false;
    state.mode = 'none';
  }
}

export function databaseState() {
  const ready = state.ready && mongoose.connection.readyState === 1;
  return { ...state, ready, connectionState: mongoose.connection.readyState };
}

