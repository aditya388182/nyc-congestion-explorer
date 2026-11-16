import { createRouter, createWebHistory } from "vue-router";
import EstimatePage from "./pages/EstimatePage.vue";
import MapPage from "./pages/MapPage.vue";
import MethodPage from "./pages/MethodPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "map", component: MapPage, meta: { title: "Map" } },
    { path: "/estimate", name: "estimate", component: EstimatePage, meta: { title: "Estimate" } },
    { path: "/method", name: "method", component: MethodPage, meta: { title: "Data & Method" } },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
router.afterEach((to) => {
  document.title = `${String(to.meta["title"])} · NYC Congestion Toll Explorer`;
});
