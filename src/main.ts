import { mount } from "svelte";
import App from "./App.svelte";
import "./app.css";
import { initOffline } from "$lib/offline/sync";

const app = mount(App, { target: document.getElementById("app")! });

initOffline();

export default app;
