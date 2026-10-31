---
title: "Paper: Learning from Next-Frame Prediction: Towards Unified and Scalable Visual Representation Learning"
last_modified_at: 2026-10-31
categories:
  - Blog
tags:
  - Paper
---

[The paper](https://arxiv.org/abs/2610.30724). I have to talk about this one. VANE predicts next-frame embeddings from past frames, using frozen DINOv2 ViT-L targets (the so-called semantic tokenizer, I guess that's how people call pretrained encoder nowadays lol). It also trains on local-to-global image crops and uses an auxiliary generative decoder.

My first question was: how can it exceed its teacher? But predicting a future representation is a different task from copying the representation of the current input. My understanding is that the student may need to encode motion to predict where an object goes, even if the teacher only describes each frame separately. Also, the encoder features we evaluate are not required to be identical to the predictor's output. So teacher performance is not an obvious upper bound here.

Still, my initial excitement about beating DINOv3 needs some qualification. In their protocol, VANE trails DINOv3 ViT-H+ on ImageNet (87.5 vs. 88.2) and segmentation, while doing better on the two depth benchmarks. Quite promising, but not winning at everything.

The appendix has a more interesting detail. In [Table 8](https://arxiv.org/html/2610.30724v1#A4.SS1)'s matched ViT-L/50K comparison, VANE only narrowly beats standard V-JEPA 2.1 on SSv2: 72.3 vs. 72.0. Replacing that baseline's EMA teacher with frozen DINOv2 improves spatial results but *reduces* SSv2 to 70.6. And in [Table 5](https://arxiv.org/html/2610.30724v1#S4.SS4), removing VANE's generative decoder drops ADE20K from 45.1 to 42.8, with much smaller classification changes.

To me this raises a more useful question than whether frozen teachers are better: **which information does a teacher make easy to learn, and which information does it make easy to ignore?** A good image representation might still be an awkward target for some temporal differences. The result above suggests a tradeoff worth testing, though it doesn't establish the mechanism.

I'd like to see a frame-shuffling control with the same images, teacher and training budget. How much of the gain survives when real temporal order is removed? Another concern is an ambiguous future: if two different actions are plausible, how should a single predicted embedding represent both? I'd want failure cases on those clips, not only examples where one of the top predictions looks right.

I still think video SSL is a very interesting next step, as I talked about in [the LeVJEPA presentation](https://www.youtube.com/watch?v=t4VbLnyQaq0). But the part I'd like to understand is what temporal prediction actually adds, and what spatial detail we still need to explicitly protect. That's where I would start trying ideas :).
