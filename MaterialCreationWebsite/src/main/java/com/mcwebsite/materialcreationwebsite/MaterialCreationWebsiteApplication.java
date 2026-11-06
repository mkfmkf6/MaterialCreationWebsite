package com.mcwebsite.materialcreationwebsite;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.mybatis.spring.annotation.MapperScan;

@SpringBootApplication
@EnableAsync
@MapperScan("com.mcwebsite.materialcreationwebsite.mapper")
public class MaterialCreationWebsiteApplication {

    public static void main(String[] args) {
        SpringApplication.run(MaterialCreationWebsiteApplication.class, args);
        System.out.println("项目启动成功");
    }

}
