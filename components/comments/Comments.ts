import "./comments.scss";
import Mustache from "mustache";

export default class Comments {
  commentsEl = document.getElementById("comments")!;
  commentCountEl = document.getElementById("comment-count")!;
  commentFormEl = document.getElementById("comment-form")!;
  template = document.getElementById("comment-template")!.innerHTML;

  constructor() {
    this.loadComments();
    this.initForm();
  }

  initForm() {
    this.commentFormEl.addEventListener("submit", (e) => {
      e.preventDefault();
      console.log("submit");
    });
  }

  loadComments() {
    fetch("http://localhost:8080/comments/")
      .then((response) => response.json())
      .then((data) => {
        this.commentsEl.innerText = "";
        this.commentCountEl.innerText = data.length;

        let commentsHTML = "";
        data.forEach((comment: any) => {
          commentsHTML += this.commentHTML(
            comment.name,
            comment.comment,
            comment.created
          );
        });

        this.commentsEl.innerHTML = commentsHTML;
      });
  }

  commentHTML(name: string, comment: string, created: string) {
    return Mustache.render(this.template, {
      name: name,
      comment: comment,
      created: created,
    });
  }
}
