<script setup lang="ts">
import { provideClient } from "@urql/vue";
import { RouterLink, RouterView } from "vue-router";
import { client } from "./lib/api";

provideClient(client);
</script>

<template>
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <p class="brand">NYC Congestion Toll Explorer</p>
    <nav aria-label="Main">
      <RouterLink to="/" exact-active-class="current">Map</RouterLink>
      <RouterLink to="/estimate" active-class="current">Estimate</RouterLink>
      <RouterLink to="/method" active-class="current">Data &amp; Method</RouterLink>
    </nav>
  </header>
  <main id="main" tabindex="-1">
    <RouterView />
  </main>
  <footer class="site-footer">
    <p>Data: NYC TLC trip records. Study code and results are in the repository. A null, mixed or confounded result is reported as found.</p>
  </footer>
</template>
