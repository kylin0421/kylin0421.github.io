---
title: "Tech Report of MAI-Base-2"
last_modified_at: 2026-10-31
categories:
  - Blog
tags:
  - Casual
---

[The report](https://microsoft.ai/news/frontier-pre-training-at-microsoft-ai/). MAI-Base-2 is an MoE with 2.8T total and 80B active parameters. Well, clearly not something I can train lol. But there are a few things here that seem useful even without that many GPUs.

First, their small-scale experiments preserve how often each data source is repeated in the full run. If the full run sees a source eight times, the small run sees a smaller subset eight times too. Otherwise, a small experiment on mostly fresh data can favor choices that overfit when scaled up. They call this source scaling.

This is probably my favorite point. We often use small experiments to decide whether an idea deserves more compute. But what if the small experiment removed exactly the difficulty the idea was supposed to solve? For my own SSL experiments, I'd want to ask the same question about data diversity and augmentation: am I shrinking the problem, or accidentally changing it?

Second, they sweep learning rate and learning-rate-times-weight-decay jointly. This makes sense from the decay-only update:

\[
\theta_{t+1}=(1-\eta\lambda)\theta_t.
\]

Ignoring gradients and assuming constant hyperparameters, after $T$ steps the shrinkage is $(1-\eta\lambda)^T\approx e^{-T\eta\lambda}$. So keeping weight decay fixed while changing learning rate or training duration does not keep the regularization effect fixed. Quite a simple observation, yet easy to forget when copying a recipe.

Another nice failure case: putting MoE in every layer previously won on FLOPs but lost on wall-clock time because of implementation overhead. Better infrastructure changed which architecture was practical. Again, model design and engineering are hard to separate.

What I'd take away is a habit: before trusting a cheap proxy experiment, check what it preserves. For people with limited resources this matters even more, since we can't afford to discover at the end that we selected the wrong idea from the beginning.
