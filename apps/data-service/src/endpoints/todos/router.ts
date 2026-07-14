import { OpenAPIHono } from "@hono/zod-openapi";

import type { AppEnv } from "../../types";
import { createTodoHandler, createTodoRoute } from "./create";
import { deleteTodoHandler, deleteTodoRoute } from "./delete";
import { listTodosHandler, listTodosRoute } from "./list";
import { readTodoHandler, readTodoRoute } from "./read";
import { updateTodoHandler, updateTodoRoute } from "./update";

/**
 * Resource router for /todos.
 * One route module per HTTP operation; schemas shared via ./schemas.
 */
export const todosApp = new OpenAPIHono<AppEnv>();

todosApp.openapi(listTodosRoute, listTodosHandler);
todosApp.openapi(createTodoRoute, createTodoHandler);
todosApp.openapi(readTodoRoute, readTodoHandler);
todosApp.openapi(updateTodoRoute, updateTodoHandler);
todosApp.openapi(deleteTodoRoute, deleteTodoHandler);
