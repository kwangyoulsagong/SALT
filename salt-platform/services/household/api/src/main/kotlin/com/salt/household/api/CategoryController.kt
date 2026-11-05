package com.salt.household.api

import com.salt.household.application.AddCategory
import com.salt.household.application.ArchiveCategory
import com.salt.household.application.CategoryInput
import com.salt.household.application.EditCategory
import com.salt.household.application.ListCategories
import com.salt.household.domain.CustomCategory
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 사용자 분류(`SRV-REQ-046` FR-22, 가계부 S1f). 키는 서버가 짓는다(`u_` + 12자리) — 경로 조각이 늘 ASCII 라 한글 이름이 경로를 깨지 않는다.
 * 지우기는 보관이다 — 지난 지출 · 봉투 · 템플릿은 이름 그대로 남는다.
 */
@Tag(name = "household", description = "가계부 — 내 분류(SRV-REQ-046 FR-22)")
@RestController
@RequestMapping("/api/household/categories")
class CategoryController(
    private val listCategories: ListCategories,
    private val addCategory: AddCategory,
    private val editCategory: EditCategory,
    private val archiveCategory: ArchiveCategory,
) {
    /** 이름 길이 상한은 도메인이 코드로 답한다(`CATEGORY_NAME_TOO_LONG`) — 여기는 비었는지와 터무니없는 길이만 */
    data class CategoryRequest(@field:NotBlank @field:Size(max = 100) val name: String?, @field:NotBlank val bucket: String?)

    data class CategoriesView(val categories: List<HouseholdController.CategoryView>, val limit: Int)

    @Operation(summary = "분류 표", description = "기본 12(name=null) + 내 분류(보관 포함 — archived). limit 은 보관하지 않은 내 분류 상한")
    @GetMapping
    fun list(user: AuthenticatedUser): ResponseEntity<ApiResponse<CategoriesView>> =
        ApiResponse.ok(CategoriesView(categoryViews(listCategories.execute(user.userId)), CustomCategory.ACTIVE_MAX))

    @Operation(summary = "내 분류 만들기", description = "bucket=needs | wants. 같은 이름(보관 안 한 것) · 상한이면 409")
    @PostMapping
    fun add(user: AuthenticatedUser, @Valid @RequestBody body: CategoryRequest): ResponseEntity<ApiResponse<HouseholdController.CategoryView>> =
        ApiResponse.created(view(addCategory.execute(user.userId, CategoryInput(body.name!!, body.bucket!!))))

    @Operation(summary = "내 분류 고치기", description = "이름 · 묶음. 지난 지출도 새 이름 · 묶음으로 보인다")
    @PutMapping("/{key}")
    fun edit(user: AuthenticatedUser, @PathVariable key: String, @Valid @RequestBody body: CategoryRequest): ResponseEntity<ApiResponse<HouseholdController.CategoryView>> =
        ApiResponse.ok(view(editCategory.execute(user.userId, key, CategoryInput(body.name!!, body.bucket!!))))

    @Operation(summary = "내 분류 보관", description = "고르는 칸에서만 빠진다. 지난 지출 · 봉투는 그대로")
    @DeleteMapping("/{key}")
    fun archive(user: AuthenticatedUser, @PathVariable key: String): ResponseEntity<ApiResponse<Map<String, String>>> {
        archiveCategory.execute(user.userId, key)
        return ApiResponse.ok(mapOf("key" to key))
    }

    private fun view(c: CustomCategory) = HouseholdController.CategoryView(c.category.key, c.bucket.key, c.name, custom = true, archived = c.archived)
}
