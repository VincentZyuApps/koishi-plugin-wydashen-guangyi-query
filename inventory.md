---
title: 衣柜查询
aside: false
outline: false
class: query-page
---

# 衣柜查询

输入角色**原 ID（UUID）**，查询藏宝阁衣柜。暂不支持短 ID。

<script setup>
import InventoryQuery from './components/InventoryQuery.vue'
</script>

<ClientOnly>
  <InventoryQuery />
</ClientOnly>
