import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import Home from "@/views/Home.vue";
import Wallet from "@/views/holder/Wallet.vue";
import Creator from "@/views/issuer/Creator.vue";
import Inbox from "@/views/Inbox.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/inbox/",
    name: "Inbox",
    component: Inbox,
  },
  {
    path: "/wallet/",
    name: "Wallet",
    component: Wallet
  },
  {
    path: "/issue/",
    name: "Creator",
    component: Creator
  },
  {
    path: "/about",
    name: "About",
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import(/* webpackChunkName: "about" */ "../views/About.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
