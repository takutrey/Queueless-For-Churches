import { configureStore } from "@reduxjs/toolkit";
import queueReducer from "../lib/QueueSlice";

export const store = configureStore({
  reducer: {
    queue: queueReducer,
  },
});

export default store;
