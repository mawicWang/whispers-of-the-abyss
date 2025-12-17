# GOAP 引擎实现文档

本文档详细说明了游戏中 GOAP (Goal-Oriented Action Planning) 系统的实现细节。该系统用于驱动 NPC（主要是 Worker/Farmer）的行为逻辑，使其能够根据自身状态（体力、san值、无聊度）自动规划并执行复杂的行动序列。

## 1. 架构概览

系统基于 **Miniplex ECS** 架构实现。

*   **GoapSystem**: 核心系统，负责状态更新、目标选择、计划生成和动作执行。
*   **GoapComponent**: 数据组件，存储当前的目标、计划队列、黑板（Blackboard）数据以及执行状态。
*   **Attributes**: 实体属性（Stamina, Sanity, Boredom）作为驱动目标选择的核心数值。

### 核心循环
每一帧 (`GoapSystem` loop):
1.  **状态更新**: 更新 Boredom 等随时间变化的属性。
2.  **目标选择**: 根据当前属性（如体力耗尽、无聊度过高、San值归零）选择优先级最高的目标 (`Goal`)。
3.  **计划生成**: 如果当前没有计划或计划已执行完毕，根据当前目标生成一组有序的动作序列 (`Action List`)。
4.  **动作执行**: 执行当前动作的 `execute` 方法。如果动作返回 `true`，则推进到下一个动作。

---

## 2. 目标 (Goals)

目标是 AI 的最高层级驱动力。系统根据优先级逻辑动态切换目标。

| 目标名称 | 触发条件 | 优先级描述 |
| :--- | :--- | :--- |
| **RecoverStamina** | `stamina <= 0` | **最高**。体力耗尽时强制触发，直到体力回满。 |
| **KillBoredom** | `boredom > 80` | **高**。当极度无聊时触发。 |
| **Pray** | `sanity <= 0` (30% 概率) | **特殊**。San值归零后的随机行为之一。 |
| **Meditate** | `sanity <= 0` (20% 概率) | **特殊**。San值归零后的随机行为之一。 |
| **Farm** | 默认状态 | **低**。当没有生存压力或精神异常时，默认进行耕作。 |

---

## 3. 动作 (Actions)

动作是计划的基本单元。每个动作包含 `preconditions`（预置条件）、`effects`（效果）和 `execute`（执行逻辑）。

### 3.1 基础生存与工作

#### `GoHomeAction`
*   **目的**: 返回出生点/家。
*   **逻辑**: 使用寻路系统移动到 `homePosition`。

#### `RestAction`
*   **目的**: 恢复体力。
*   **逻辑**:
    *   持续 10秒 (`REST_DURATION`)。
    *   每秒恢复 `REST_RECOVERY_RATE` 体力。
    *   **完成条件**: 体力回满。

#### `FindFarmAction`
*   **目的**: 寻找可用的农田。
*   **逻辑**:
    *   扫描所有 `isWheat` 实体。
    *   寻找距离最近且 `claimedBy` 为空（或已被自己占有）的农田。
    *   **资源锁定**: 找到后立即将农田的 `claimedBy` 设为自己，防止争抢。

#### `GoToFarmAction`
*   **目的**: 移动到锁定的农田。
*   **逻辑**: 移动到 `targetFarmId` 的位置。如果移动途中丢失目标或被抢占，则动作失败，重新规划。

#### `FarmAction`
*   **目的**: 执行耕作。
*   **逻辑**:
    *   **动画同步**: 播放 `attack` 动画，强制等待 800ms (`FARM_ANIMATION_DURATION`) 以配合视觉效果。
    *   **消耗**: 减少 1点体力。
    *   **效果**: 农作物生长阶段 +1。

### 3.2 异常状态 (Corrupted/Sanity <= 0)

#### `GoToRandomSpotAction`
*   **目的**: 随机游荡。
*   **逻辑**: 在地图范围内随机选取一个坐标并移动。

#### `PrayAction`
*   **目的**: 祈祷（邪教行为）。
*   **逻辑**: 原地停留 10秒。有 30% 概率增加 Corruption（腐化值）。

#### `MeditateAction`
*   **目的**: 冥想。
*   **逻辑**: 在家停留 30秒。有 80% 概率增加 Corruption。

### 3.3 社交与娱乐

#### `WanderAction`
*   **目的**: 闲逛消磨时间。
*   **逻辑**: 随机移动后停留 5秒。大幅降低 Boredom。

#### `ChatWithOtherAction`
*   **目的**: 社交。
*   **逻辑**:
    *   依赖 **握手协议 (Handshake Protocol)**：
        1.  发起者在 `UpdateSensors` 中寻找 48px 内的邻居，设置邻居的 `socialRequestFrom`。
        2.  接收者在主循环中检测请求，设置发起者的 `socialAccepted`。
        3.  双方确认连接后，执行此动作。
    *   持续 5秒，播放动画，清空 Boredom。

---

## 4. 状态管理与黑板 (Blackboard)

`GoapComponent.goap.blackboard` 用于存储跨动作的上下文数据，不直接存储在 Entity 组件上。

### 关键状态变量
*   `targetFarmId`: 当前锁定的农田 ID。
*   `homePosition`: 实体归属的坐标。
*   `socialTargetId`: 当前社交对象的 ID。
*   **计时器**: `restTimer`, `farmStartTime`, `prayTimer` 等，用于控制持续性动作的时间。

### 资源竞争处理
系统使用 **Claim 机制** 处理农田争夺：
*   实体在 `FindFarmAction` 阶段写入 `wheatEntity.claimedBy = self.id`。
*   后续动作 (`GoToFarm`, `Farm`) 会反复校验 `claimedBy`。
*   如果中途体力耗尽放弃耕作，或任务被打断，系统会尝试释放 `claimedBy`（设为 `undefined`）。

---

## 5. 技术约束与细节

### 5.1 移动与执行分离 (Move-Before-Act)
系统强制要求 **先移动到位，再执行逻辑**。
*   `navigateTo(entity, x, y)` 辅助函数会检查距离。
*   只有当距离目标小于 **4px** 时，才会认为到达并允许执行后续逻辑（如耕作）。
*   长距离移动由 `path` 和 `MoveSystem` 接管，`GoapSystem` 在移动期间会返回 `false` (Action Running) 直到到达。

### 5.2 动画系统集成
Action 显式控制 `appearance.animation`：
*   `FarmAction`: 强制设置为 `attack`。
*   `RestAction` / `PrayAction`: 强制设置为 `idle`。
*   **方向控制**: 在执行动作前（如耕作、对话），AI 会计算目标向量并更新 `appearance.direction` 以朝向目标。

### 5.3 寻路 (Pathfinding)
*   使用 A* 算法 (`findPath`)。
*   **动态避障**: 每一帧或每次寻路时，会收集所有 `isObstacle` 实体的网格坐标，防止穿墙。
