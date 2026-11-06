package com.mcwebsite.materialcreationwebsite.service;

import com.mcwebsite.materialcreationwebsite.domain.bo.CreationTaskBO;
import com.mcwebsite.materialcreationwebsite.domain.entity.TemplateEntity;
import com.mcwebsite.materialcreationwebsite.mapper.CreationMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CreationServiceTest {
    @TempDir
    Path tempDir;

    @Test
    void rejectsAFileThatOnlyClaimsToBeAnImage() {
        CreationMapper mapper = mock(CreationMapper.class);
        when(mapper.findTemplate("template")).thenReturn(template());
        CreationService service = new CreationService(mapper, mock(TaskProcessor.class), tempDir.toString());
        MockMultipartFile fakeImage = new MockMultipartFile("images", "fake.jpg", "image/jpeg", "not-an-image".getBytes());

        assertThatThrownBy(() -> service.create(new CreationTaskBO("demo-user", "template", List.of(fakeImage))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("不是可识别的图片");
    }

    @Test
    void acceptsAValidPngImage() throws Exception {
        CreationMapper mapper = mock(CreationMapper.class);
        when(mapper.findTemplate("template")).thenReturn(template());
        CreationService service = new CreationService(mapper, mock(TaskProcessor.class), tempDir.toString());
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", bytes);
        MockMultipartFile image = new MockMultipartFile("images", "valid.png", "image/png", bytes.toByteArray());

        service.create(new CreationTaskBO("demo-user", "template", List.of(image)));
    }

    private TemplateEntity template() {
        TemplateEntity template = new TemplateEntity();
        template.setId("template");
        template.setName("测试模板");
        template.setImage("/template.png");
        template.setRequiredImageCount(1);
        template.setAcceptedMimeTypes("image/jpeg,image/png");
        template.setMaxFileSizeBytes(1024 * 1024L);
        return template;
    }
}
