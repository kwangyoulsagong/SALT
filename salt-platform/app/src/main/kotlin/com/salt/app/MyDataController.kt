package com.salt.app

import com.salt.support.persistence.ExportedTable
import com.salt.support.persistence.PersonalData
import com.salt.support.persistence.TableClass
import com.salt.support.web.ApiResponse
import com.salt.support.web.AuthenticatedUser
import com.salt.support.web.EraseGrants
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import org.springframework.http.HttpStatus

/**
 * 서비스마다 같은 세 경로 — 내 데이터 내보내기 · 지우기(`SRV-REQ-048` FR-3 · 4, 서버 S3c) · 저장하는 것의 등급(FR-6, 서버 S3d).
 * 서비스 조립이 내놓은 [PersonalData] 를 이름으로 고른다. **identity 는 여기 없다** — 계정 행은 마지막이고 삭제 기록과 한 트랜잭션이라
 * 자기 경로(`/api/identity/me`)로만 지운다.
 *
 * 지우기는 접근 토큰 + 지우기 허가(`X-Salt-Erase`) 둘 다 — 허가는 비밀번호를 다시 친 사람에게만 나온다([EraseGrants]).
 */
@Tag(name = "my-data", description = "서비스별 내 데이터 — 내보내기 · 지우기(SRV-REQ-048 FR-3 · 4)")
@RestController
class MyDataController(sources: List<PersonalData>, private val grants: EraseGrants) {
    private val byService: Map<String, PersonalData> = sources.associateBy { it.service }

    init {
        require(byService.size == sources.size) { "같은 서비스 이름의 내 데이터 창구가 둘" }
        require(IDENTITY !in byService) { "identity 는 자기 경로로만 지운다" }
    }

    data class ServiceExportBody(val service: String, val tables: List<ExportedTable>)

    data class ServiceErasureBody(val service: String, val deleted: Map<String, Int>)

    data class ServiceClassificationBody(val service: String, val tables: List<TableClass>)

    @Operation(summary = "이 서비스의 내 데이터")
    @GetMapping("/api/{service}/me/data")
    fun export(@PathVariable service: String, user: AuthenticatedUser): ResponseEntity<ApiResponse<ServiceExportBody>> =
        ApiResponse.ok(ServiceExportBody(service, source(service).export(user.userId)))

    @Operation(summary = "이 서비스가 저장하는 사람 표 · 등급(기록 · 금액 · 민감) · 설명 — 누구에게나 같은 답(`SRV-REQ-048` FR-6)")
    @GetMapping("/api/{service}/me/data-classification")
    fun classification(@PathVariable service: String, user: AuthenticatedUser): ResponseEntity<ApiResponse<ServiceClassificationBody>> =
        ApiResponse.ok(ServiceClassificationBody(service, source(service).classification()))

    @Operation(summary = "이 서비스의 내 데이터 지우기 — 지우기 허가 필요. 다시 불러도 안전")
    @DeleteMapping("/api/{service}/me/data")
    fun erase(
        @PathVariable service: String,
        user: AuthenticatedUser,
        @RequestHeader(EraseGrants.HEADER, required = false) grant: String?,
    ): ResponseEntity<ApiResponse<ServiceErasureBody>> {
        val source = source(service)
        grants.require(grant, user)
        return ApiResponse.ok(ServiceErasureBody(service, source.erase(user.userId)))
    }

    private fun source(service: String): PersonalData = byService[service] ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)

    private companion object {
        const val IDENTITY = "identity"
    }
}
