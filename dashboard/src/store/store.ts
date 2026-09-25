// store/store.ts - No redux-persist
import { configureStore, combineReducers } from "@reduxjs/toolkit";

import authReducer from "@/lib/AuthSlice";
import usersReducer from "@/lib/UserSlice";

import auditlogsReducer from "@/lib/AuditLogSlice";
import authQueueReducer from "@/lib/QueueSlice";
import lockedAccountsReducer from "@/lib/LockedAccountsSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  users: usersReducer,

  auditlogs: auditlogsReducer,
  authQueue: authQueueReducer,
  lockedAccounts: lockedAccountsReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable if you have non-serializable values
    }),
});

// No persistor needed

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
