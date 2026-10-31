---
title: "CS336 Attention Alternatives"
last_modified_at: 2026-10-31
categories:
  - Blog
tags:
  - Formal
  - Study
---

Some notes from [CS336](https://cs336.stanford.edu/). There are two main directions I want to talk about: linear/recurrent models, which compress history into a state, and sparse attention, which only reads some of the history. Both try to make long sequences cheaper, yet the information they give up is quite different.

## Linear attention

The starting intuition is to rewrite $(QK^{\top})V$ into $Q(K^{\top}V)$. Consider $Q,K\in\mathbb R^{n\times d_k}$ and $V\in\mathbb R^{n\times d_v}$:

- Computing $QK^{\top}$ and then multiplying by $V$ costs $O(n^2d_k+n^2d_v)$.
- Computing $K^{\top}V$ first gives a $d_k\times d_v$ matrix. Both multiplications now cost $O(nd_kd_v)$, so the total is linear in sequence length when the feature dimensions are fixed.

Sounds almost too easy. The catch is that actual attention has a softmax in the middle, and we cannot move that around with matrix associativity lol. Linear attention changes the operation, sometimes using feature maps and normalization; it is not simply a faster implementation of exactly the same softmax attention.

For a causal sequence, the simplest unnormalized version can be written as:

\[
S_t=S_{t-1}+k_tv_t^{\top},\qquad o_t=q_t^{\top}S_t.
\]

Here the vectors are columns and $S_t\in\mathbb R^{d_k\times d_v}$. We keep updating one fixed-size state instead of keeping a growing KV cache. Quite attractive for decoding, but every new association is being added into the same memory. What happens when many keys are similar, or an old fact gets updated?

This is where the update rule becomes interesting. Mamba-style models introduce input-dependent state dynamics; DeltaNet uses an error-correcting update. In the same orientation as above, a delta update is:

\[
S_t=S_{t-1}+\beta_t k_t\left(v_t^{\top}-k_t^{\top}S_{t-1}\right).
\]

Rather than blindly adding the value, it writes the difference from what the memory already retrieves. Gating can additionally forget old content. [Gated DeltaNet](https://arxiv.org/abs/2412.06464) combines these ideas. Mamba and DeltaNet are related recurrent alternatives, though calling both just a rearrangement of $QK^{\top}V$ would be too rough.

## Sparse attention

Sparse attention keeps explicit tokens but limits which ones a query can read. A local window is one option; learned selection is another. [DeepSeek Sparse Attention](https://arxiv.org/abs/2512.02556) uses a cheap indexer to score the history, selects top-k entries, then applies attention to them.

One detail that is easy to miss: **selecting tokens also costs something.** If every query still scores every previous token, that indexing part remains quadratic over a full sequence, even when it is much cheaper than the original attention. And computing the full expensive attention matrix before dropping most entries would barely solve our original problem.

Personally, I find the failure cases more interesting. A recurrent state might overwrite a detail before we know we need it; a sparse selector might keep the detail in memory but fail to retrieve it. I would like to test both with a sequence where a seemingly useless early fact only becomes relevant much later. Then vary the number of distractors, not just the sequence length. That might tell us more than another average score.

Anyway, lower FLOPs is only part of efficiency. For an actual experiment I'd still want to see prefill time, decoding speed and memory at the batch size I can afford. A theoretically nicer method that takes longer on my GPUs is still slower for me :).
