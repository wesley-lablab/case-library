<script setup lang="ts">
import FilterSection from '@/components/FilterSection.vue'
import SelectionToolbar from '@/components/SelectionToolbar.vue'
import CaseList from '@/components/CaseList.vue'
import Pagination from '@/components/Pagination.vue'
</script>

<template>
  <div>
    <FilterSection />
    <SelectionToolbar />
    <CaseList />
    <Pagination />
  </div>
</template>
