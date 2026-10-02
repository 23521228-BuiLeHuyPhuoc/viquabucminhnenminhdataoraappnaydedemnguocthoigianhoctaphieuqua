import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {
  connectTimeoutMS: 8000,
  serverSelectionTimeoutMS: 8000,
};

let client;
let clientPromise;

if (!uri) {
  console.warn('Cảnh báo: Chưa cấu hình biến môi trường MONGODB_URI.');
} else {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the MongoClient is not repeated
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
}

export async function getDatabase() {
  if (!clientPromise) {
    throw new Error('Chưa thiết lập kết nối MongoDB. Kiểm tra MONGODB_URI.');
  }
  const connectedClient = await clientPromise;
  const dbName = process.env.MONGODB_DB || 'dongho';
  return connectedClient.db(dbName);
}

export default clientPromise;
