---
title: "(TBD) Thoughts about augmentations in self-supervised learning"
last_modified_at: 2026-10-03
categories:
  - Blog
tags:
  - Formal
  - Idea
---

Recently a paper on self-supervised learning on video data has come out: [LeVJEPA](https://arxiv.org/pdf/2608.27395) .

The main idea is to basically align the invariance+distribution regularization (anti-collapse) paradigm in [LeJEPA](https://arxiv.org/abs/2511.08544) to video representation learning. Given that videos are usually very redundant especially in temporally consecutive frames, they apply very aggressive random masking (95% masking ratio) for efficiency.

The results are quite convincing with fairly strong performance in terms of action recognition, motion classification and object recognition. Yet my main concern when I first looked at it was dense performance: such aggressive token dropping would very likely force the model to learn information that is commonly visible both spatially and temporally, which might lose spatial structure. And indeed, the evaluation results suggest this:


![image](/assets/media/2026-10-03-c86ac502-2d6c-4bd6-954c-c6efe52862ea.png)

