package vn.edu.vnu.status.model;

import javax.persistence.*;

@Entity
@Table(name = "settings")
public class Setting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "key_name", unique = true, nullable = false, length = 50)
    private String keyName;

    @Column(columnDefinition = "TEXT")
    private String value;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getKeyName() { return keyName; }
    public void setKeyName(String keyName) { this.keyName = keyName; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}
