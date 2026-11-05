package com.salt.content.domain

import com.salt.kernel.DomainError
import com.salt.kernel.ErrorKind
import java.time.Instant

/**
 * 읽기 전에 맞혀 보기(`SRV-REQ-047` FR-8 · FEATURE-014 FR-8, 금융 팁 S2b). 글 하나에 문제 0~1개 — 원문 머리 블록 네 칸
 * (`quiz_question` · `quiz_choices` · `quiz_answer` · `quiz_explain`)이 **전부 있거나 전부 없어야** 한다([PublishCheck]).
 *
 * 채점은 서버가 한다 — 공개 글 응답엔 정답이 없다(먼저 맞혀 보는 재미가 화면 DOM 에서 새지 않게). 시간 제한은 두지 않는다:
 * 재촉 · 타이머는 이 앱이 하지 않는 일이다(통제 · 강제 0). "30초"는 문제 길이의 목표일 뿐이다.
 */
data class TipQuiz(
    val question: String,
    val choices: List<String>,
    /** 0부터 — 원문은 글쓴이가 읽기 쉽게 1부터 적는다 */
    val answerIndex: Int,
    val explanation: String,
) {
    init {
        require(choices.size in CHOICES) { "보기는 ${CHOICES.first}~${CHOICES.last}개" }
        require(answerIndex in choices.indices) { "정답 번호가 보기 밖" }
    }

    /** @throws InvalidQuizChoice 보기 밖 번호 */
    fun grade(choice: Int): Graded {
        if (choice !in choices.indices) throw InvalidQuizChoice(choice, choices.size)
        return Graded(correct = choice == answerIndex, answerIndex = answerIndex, explanation = explanation)
    }

    fun texts(): List<String> = listOf(question, explanation) + choices

    data class Graded(val correct: Boolean, val answerIndex: Int, val explanation: String)

    companion object {
        val CHOICES = 2..4
        const val QUESTION_MAX = 80
        const val CHOICE_MAX = 40
        const val EXPLAIN_MAX = 140
        const val CHOICE_SEPARATOR = "|"
        val KEYS = listOf("quiz_question", "quiz_choices", "quiz_answer", "quiz_explain")
    }
}

/**
 * 한 사람 · 한 문제의 기록(`DB-REQ-039` FR-6 `quiz_answer`). 몇 번이든 다시 풀 수 있고, **한 번이라도 맞히면 카드가 된다**
 * ([correctAt] — 처음 맞힌 시각, 그 뒤로 틀려도 지우지 않는다: 모음은 잃는 것이 없어야 재미다).
 */
data class QuizRecord(val userId: String, val slug: String, val attempts: Int, val correctAt: Instant?)

class QuizNotFound(slug: String) : DomainError("TIP_QUIZ_NOT_FOUND", ErrorKind.NOT_FOUND, "Tip has no quiz", mapOf("slug" to slug))

class InvalidQuizChoice(choice: Int, size: Int) :
    DomainError("INVALID_QUIZ_CHOICE", ErrorKind.INVALID, "choice must be between 0 and ${size - 1}", mapOf("choice" to choice))
