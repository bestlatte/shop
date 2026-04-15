package org.example.productshop.dao;

import org.example.productshop.api.BCrypt;
import org.example.productshop.entity.Member;
import org.example.productshop.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.UUID;

@Component
public class RegisterDaoImpel implements RegisterDao {

    @Autowired
    private NamedParameterJdbcTemplate namedParameterJdbcTemplate;
    @Autowired
    private EmailService emailService;

    @Override
    public String register(Member member) {
        String sql = "INSERT INTO members (email, password, name, phone, created_at, last_login, status, verify_token, verify_token_created_at) " +
                "VALUES (:email, :password, :name, :phone, NOW(), NULL, :status, :token, :token_created_at)";

        HashMap<String, Object> map = new HashMap<>();
        String token = UUID.randomUUID().toString();

        map.put("email", member.getEmail());
        map.put("password", BCrypt.hashpw(member.getPassword(), BCrypt.gensalt()));
        map.put("name", member.getName());
        map.put("phone", member.getPhone());
        map.put("status", "pending");
        map.put("token", token);
        map.put("token_created_at", LocalDateTime.now());

        try {
            namedParameterJdbcTemplate.update(sql, map);
        } catch (DuplicateKeyException e) {
            return "此 Email 已被註冊";
        }

        try {
            emailService.sendVerificationEmail(member.getEmail(), token);
        } catch (Exception e) {
            System.err.println("寄送驗證信失敗: " + e.getMessage());
            return "註冊成功，但驗證信寄送失敗，請稍後使用重寄驗證信功能";
        }

        return "註冊成功，請至信箱點擊驗證連結完成啟用";
    }



}
