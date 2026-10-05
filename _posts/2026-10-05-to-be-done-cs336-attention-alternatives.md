---
title: "(To be done) CS336 Attention Alternatives"
last_modified_at: 2026-10-05
categories:
  - Blog
tags:
  - Formal
  - Lecture
---

There are two main families of efficient attention alternatives: 

1) Linear-time attention. The representatives are state space models such as Mamba and DeltaNet. The general intuition behind these is to try to rewrite $(QK^\{top})V$ into $Q(K^{\top}V)$; 

2) Sparse attention. The most common approach is to first use a light-weight indexer which operates on the full sequence to choose topk tokens, then perform full attention on top of those. A representative is [Deepseek Sparse Attention (DSA)](https://arxiv.org/abs/2512.02556)

Lets first talk about linear attention. As we said, the key is to write $(QK^T)V$ into $Q(K^TV)$. The latter gives us linear complexity with respect to sequence length(O(n)). Why? Consider the complexity of $(QK^T)V$ where $Q \in R^{n*d_k}, K \in R^{n*d_k}, V \in R^{n*d_v}$:

First,  