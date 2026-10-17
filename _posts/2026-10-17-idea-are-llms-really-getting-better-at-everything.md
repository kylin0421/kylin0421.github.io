---
title: "Idea: Are LLMs really getting better at everything?"
last_modified_at: 2026-10-17
categories:
  - Blog
tags:
  - Idea
---

# Background

According to scaling law, it seems that as we have larger and larger models (assuming they're descently trained), they will generally be better from every aspect. But are their any missing spots here? For example, can a model be better at code and math etc. while being worse at creative writing, being honest etc.?

If we can take relatively extensive benchmarks that cover quite diverse disciplines that we care about and evaluate models from different time (preferably even within the same model family, such as Qwen 2.5, 3, 3.5 and 3.8), we can gain a more concrete understanding of what are LLMs getting better at consistently, and what might not.

# Related Work

## Holistic Evaluation of LLMs

Several works have been trying to evaluate comprehensive aspects of LLM capabilities. For now I'll just list them here without introducing each:

- [HELM](https://crfm.stanford.edu/2022/11/17/helm)

- [Big-bench](https://github.com/google/BIG-bench)

- [lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness)


## Regression of LLM capability

Several works have found some sort of regression in terms of specific LLM capabilities, yet they are usually focusing on some specific aspects instead of the overall view:

- [NoveltyBench](https://arxiv.org/abs/2504.05228)

- [AbstentionBench](https://arxiv.org/abs/2506.09038)

- [Perspective Scaling](https://proceedings.mlr.press/v306/zhang26by.html) This one is especially interesting. It suggests that most tasks' compute-conditioned capability boundaries are relatively stable with the exception of math reasoning (probably thanks to its highly verifiable nature). It's thus better to not only find regression but also preferably measure the speed of development (it could be negative) of different capabilities.