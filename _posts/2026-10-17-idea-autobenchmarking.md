---
title: "Idea: Autobenchmarking"
last_modified_at: 2026-10-17
categories:
  - Blog
tags:
  - Casual
---

# Background & Motivation

Reliable benchmarking is crucial to the development of AI. Yet many efforts on creating such benchmarks seems highly time-confuming yet automatable compared to the attempt to automate research as a whole. In general, they can be abstracted into:

**Idea proposal** (What aspects do you what to measure? e.g. Time awareness of agents.)

↓

**Significance & Novelty check** (Is the idea valuable? Is it novel? If not, go back to last stage and refine it or try another one)

↓

**Task Specification** (To measure the aspect, how do we design the task? e.g. Can agents deliver successfully under specified time budget? The metric could be rate of success and task-specific performance measurements. How well can agent make use of time? The metric could be again performance and maybe some measurements about time utility.)

↓

**Dataset Discovery** (Which **existing** datasets can be used? This is very important because it ensures the integrity and validity by reusing existing datasets instead of creating new ones. Of course there comes limitations too. For example dynamic benchmarking which generates new data for more robust estimate of capabilities could be explored. Yet, dynamic benchmarking has its own issues too.)

↓

**Dataset Adaptation** (After we decide the datasets, we may have to make some adjustments to make them suitable for our task. e.g. We have to design experimental settings with different time budget. )

↓

**Implementation and Experimentation**

↓

**Analysis** (Based on the experimental results, we try to find some patterns and maybe draw some interesting conclusions/findings. We might also appear to find some mistakes or failures, for which we go back to last stage and iterate until we are satisfied.)

# Related Work 

| Work | What It Already Addresses | What It Does Not Cover |
|---|---|---|
| [AI Scientist-v2](https://arxiv.org/abs/2504.08066) | End-to-end research automation, including idea generation, experimentation, coding, result analysis, and paper writing. | A general-purpose research agent without specialized support for dataset discovery and evaluation protocol design in benchmarking research. |
| [AgentExpt (ICML 2026)](https://proceedings.mlr.press/v306/li26cb.html) | Automated recommendation of suitable datasets and baselines for research experiments. | Does not automate the complete workflow from a research question to a finished benchmarking paper. |
| [DatasetResearch (2025)](https://arxiv.org/abs/2508.06960) | Systematic evaluation of agents' ability to discover existing datasets based on research requirements. | Focuses on benchmarking dataset discovery rather than providing an end-to-end Auto-Benchmarking system. |
| [BenchAgents](https://arxiv.org/abs/2410.22584) | Automated benchmark planning, generation, verification, and evaluation. | Primarily focuses on constructing evaluation instances rather than automating the complete benchmarking research process. |
| [AutoSciBench](https://arxiv.org/abs/2610.05140) | Automated generation and iterative refinement of scientific agent evaluation tasks based on existing benchmarks and feedback. | Emphasizes evaluation task generation and improvement rather than conducting an entire benchmarking study from an open-ended research question to a finished paper. |
