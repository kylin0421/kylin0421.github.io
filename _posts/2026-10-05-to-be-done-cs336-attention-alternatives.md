---
title: "(To be done) CS336 Attention Alternatives"
last_modified_at: 2026-10-05
categories:
  - Blog
tags:
  - Casual
---

There are two main families of efficient attention alternatives: 1) Linear-time attention. The representatives are state space models such as Mamba and DeltaNet. The general intuition behind these is to compress kv memory into a fixed size matrix which allows both reduced complexity ($n^2d_k+n^2d_v -> 2nd_vd_k$) ; 2)